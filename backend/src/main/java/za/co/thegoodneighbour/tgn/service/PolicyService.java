package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.payment.DebitOrderGateway;
import za.co.thegoodneighbour.tgn.repo.*;

@Service
public class PolicyService {
    /** Staff-driven status changes. Activation is not here: it only follows a recorded payment. */
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "pending_review", Set.of("approved", "declined"),
            "approved", Set.of("cancelled"),
            "active", Set.of("lapsed", "cancelled"),
            "lapsed", Set.of("cancelled"));

    private final PolicyRepository policies;
    private final PaymentRecordRepository payments;
    private final AppUserRepository users;
    private final CoverService cover;
    private final AuditService audit;
    private final DebitOrderGateway debitOrders;
    private final LegalService legal;
    private final OtpService otp;
    private final SupportRequestRepository support;
    private final Clock clock;

    public PolicyService(PolicyRepository policies, PaymentRecordRepository payments, AppUserRepository users, CoverService cover,
                         AuditService audit, DebitOrderGateway debitOrders, LegalService legal, OtpService otp, SupportRequestRepository support, Clock clock) {
        this.policies = policies; this.payments = payments; this.users = users; this.cover = cover; this.audit = audit;
        this.debitOrders = debitOrders; this.legal = legal; this.otp = otp; this.support = support; this.clock = clock;
    }

    private LocalDate today() { return LocalDate.now(clock); }

    // ---------------- customer ----------------

    @Transactional
    public PolicyDto apply(AppUser user, ApplyRequest r) {
        LocalDate today = today();
        CoverConfig cfg = cover.config();
        if (otp.smsEnabled() && !users.findById(user.getId()).map(AppUser::isPhoneVerified).orElse(false))
            throw CoverService.unprocessable("Please verify your mobile number first.");
        int termsV = legal.version("terms"), privacyV = legal.version("privacy");
        if (r.acceptedTermsVersion() != termsV || r.acceptedPrivacyVersion() != privacyV)
            throw CoverService.unprocessable("Our terms have changed. Please review and accept them again.");
        if (policies.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().anyMatch(p -> Policy.OPEN_FOR_CHANGES.contains(p.getStatus())))
            throw new ApiException(HttpStatus.CONFLICT, "You already have a cover in progress. You can change it or add family members instead.");
        if (!CoverService.DEBIT_DAYS.contains(r.debitDay())) throw CoverService.unprocessable("Please choose one of the available debit dates.");

        LocalDate dob = SaId.dateOfBirth(r.holderIdNumber(), today)
                .orElseThrow(() -> CoverService.unprocessable("That ID number doesn't look right. Please check it and try again."));
        int age = CoverRules.age(dob, today);
        if (age < cfg.getMainMinAge() || age > cfg.getMainMaxAge())
            throw CoverService.unprocessable("This cover is for people aged " + cfg.getMainMinAge() + " to " + cfg.getMainMaxAge() + ".");

        List<MemberIn> members = r.members() == null ? List.of() : r.members();
        QuoteDto q = cover.quote(r.items(), members.stream().map(m -> new QuoteMemberIn(m.relationship(), m.dateOfBirth())).toList(), dob, null);
        if (!q.valid()) throw CoverService.unprocessable(q.problems().get(0));

        Policy policy = new Policy(user.getId(), user.getFullName(), r.holderIdNumber(), dob.toString(), r.debitDay());
        Set<String> ids = new HashSet<>(List.of(r.holderIdNumber()));
        for (MemberIn m : members) policy.addMember(buildMember(cfg, m, ids, today, null));
        policy.recordConsent(termsV, privacyV);
        policy.setBundle(cover.write(List.of(new BundleVersionDto(1, today.toString(), null, q.bundleValueCents(), q.baseMonthlyCents(), q.lines()))), q.baseMonthlyCents());
        recompute(policy);
        return toDto(policies.save(policy), false);
    }

    @Transactional
    public PolicyDto changeBundle(AppUser user, String policyId, BundleChangeRequest r) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        CoverConfig cfg = cover.config();
        QuoteDto q = cover.quote(r.items(), memberQuote(policy), LocalDate.parse(policy.getHolderDob()), policy.getId());
        if (!q.valid()) throw CoverService.unprocessable(q.problems().get(0));
        List<BundleVersionDto> versions = new ArrayList<>(cover.versions(policy));
        BundleVersionDto old = versions.get(versions.size() - 1);
        LocalDate today = today();
        if (policy.getStartDate() == null) {
            // Cover hasn't started: just replace the bundle on the application.
            versions.set(versions.size() - 1, new BundleVersionDto(old.version(), today.toString(), null, q.bundleValueCents(), q.baseMonthlyCents(), q.lines()));
        } else {
            boolean upgrade = q.bundleValueCents() > old.bundleValueCents();
            String waiting = upgrade ? today.plusDays(cfg.getUpgradeWaitingDays()).toString() : null;
            versions.add(new BundleVersionDto(old.version() + 1, today.toString(), waiting, q.bundleValueCents(), q.baseMonthlyCents(), q.lines()));
        }
        policy.setBundle(cover.write(versions), q.baseMonthlyCents());
        recompute(policy);
        return toDto(policies.save(policy), false);
    }

    @Transactional
    public PolicyDto addMember(AppUser user, String policyId, MemberIn m) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        CoverConfig cfg = cover.config();
        LocalDate today = today();
        List<QuoteMemberIn> all = new ArrayList<>(memberQuote(policy));
        all.add(new QuoteMemberIn(m.relationship(), m.dateOfBirth()));
        BundleVersionDto cur = cover.current(policy);
        QuoteDto q = cover.quote(cur.lines().stream().map(l -> new BundleLineIn(l.itemId(), l.quantity())).toList(), all, LocalDate.parse(policy.getHolderDob()), policy.getId());
        // Only the new person can be a problem here; the existing bundle was valid when it was set.
        List<String> mine = q.problems().stream().filter(p -> !p.startsWith("Your cover needs") && !p.contains("temporarily unavailable")).toList();
        if (!mine.isEmpty()) throw CoverService.unprocessable(mine.get(0));
        Set<String> ids = new HashSet<>();
        ids.add(policy.getHolderIdNumber());
        policy.activeMembers().forEach(x -> { if (x.getIdNumber() != null) ids.add(x.getIdNumber()); });
        String coverStart = "active".equals(policy.getStatus()) ? today.plusDays(cfg.getNaturalWaitingDays()).toString() : null;
        policy.addMember(buildMember(cfg, m, ids, today, coverStart));
        recompute(policy);
        return toDto(policies.save(policy), false);
    }

    /**
     * Customers can correct a name at any time. Identity details (ID number, date of birth, relationship) can be changed
     * freely only before cover starts, or an ID added where there was none. After that, changing who a person is needs
     * staff, so nobody can swap one person for another and skip the waiting period.
     */
    @Transactional
    public PolicyDto editMember(AppUser user, String policyId, String memberId, EditMemberIn e) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        PolicyMember m = findActive(policy, memberId);
        boolean started = policy.getStartDate() != null;
        List<String> changed = applyEdit(policy, m, e, !started);
        if (changed.isEmpty()) return toDto(policy, false);
        recompute(policy);
        audit.record("customer", "member.edited", "policy", policy.getId(), "fields: " + String.join(", ", changed));
        return toDto(policies.save(policy), false);
    }

    @Transactional
    public AdminPolicyDto adminEditMember(StaffUser staff, String policyId, String memberId, EditMemberIn e) {
        Policy policy = policies.findById(policyId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy."));
        PolicyMember m = findActive(policy, memberId);
        String before = m.getRelationship();
        List<String> changed = applyEdit(policy, m, e, true);
        if (!changed.isEmpty()) {
            recompute(policy);
            audit.record(staff.getEmail(), "member.edited", "policy", policy.getId(),
                    "fields: " + String.join(", ", changed) + (changed.contains("relationship") ? " (relationship " + before + " -> " + m.getRelationship() + ")" : ""));
            policies.save(policy);
        }
        return new AdminPolicyDto(toDto(policy, true), customer(policy));
    }

    private PolicyMember findActive(Policy policy, String memberId) {
        return policy.activeMembers().stream().filter(x -> x.getId().equals(memberId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that family member on your cover."));
    }

    /** Applies the edit if the rules allow, returning the names of the fields that changed. `identityAllowed` lifts the after-start limit. */
    private List<String> applyEdit(Policy policy, PolicyMember m, EditMemberIn e, boolean identityAllowed) {
        CoverConfig cfg = cover.config();
        LocalDate today = today();
        List<String> changed = new ArrayList<>();
        String newName = e.fullName() != null ? e.fullName().trim() : null;
        String newRel = e.relationship() != null && !e.relationship().equals(m.getRelationship()) ? e.relationship() : null;
        String newDob = e.dateOfBirth() != null && !e.dateOfBirth().equals(m.getDateOfBirth()) ? e.dateOfBirth() : null;
        String newId = e.idNumber() != null && !e.idNumber().isBlank() && !e.idNumber().equals(m.getIdNumber()) ? e.idNumber() : null;

        boolean addingMissingId = newId != null && m.getIdNumber() == null;
        if ((newRel != null || newDob != null || (newId != null && !addingMissingId)) && !identityAllowed)
            throw CoverService.unprocessable("To change " + (newRel != null ? "the relationship" : newDob != null ? "the date of birth" : "the ID number")
                    + " now that your cover has started, please contact us and we'll help.");

        String rel = newRel != null ? newRel : m.getRelationship();
        String dobStr = newDob != null ? newDob : m.getDateOfBirth();
        LocalDate dob;
        try { dob = LocalDate.parse(dobStr); } catch (java.time.DateTimeException ex) { throw CoverService.unprocessable("That date doesn't look right."); }
        String id = newId != null ? newId : m.getIdNumber();

        if (newRel != null || newDob != null) {
            long sameRel = policy.activeMembers().stream().filter(x -> x != m && x.getRelationship().equals(rel)).count();
            long others = policy.activeMembers().stream().filter(x -> x != m).count();
            CoverRules.memberProblem(cfg, rel, dob, sameRel, others, today).ifPresent(msg -> { throw CoverService.unprocessable(msg); });
        }
        if (id != null) {
            LocalDate fromId = SaId.dateOfBirth(id, today).orElseThrow(() -> CoverService.unprocessable("That ID number doesn't look right."));
            if (!fromId.equals(dob)) throw CoverService.unprocessable("The ID number doesn't match the date of birth.");
            Set<String> used = new HashSet<>();
            used.add(policy.getHolderIdNumber());
            policy.activeMembers().forEach(x -> { if (x != m && x.getIdNumber() != null) used.add(x.getIdNumber()); });
            if (used.contains(id)) throw CoverService.unprocessable("That ID number is already on this cover.");
        } else if (CoverRules.age(dob, today) >= 16) {
            throw CoverService.unprocessable("Please add an ID number: they are 16 or older.");
        }

        if (newName != null && !newName.equals(m.getFullName())) { m.setFullName(newName); changed.add("name"); }
        if (newId != null) { m.setIdNumber(newId); changed.add("ID number"); }
        if (newDob != null) { m.setDateOfBirth(newDob); changed.add("date of birth"); }
        if (newRel != null) {
            m.setRelationship(rel, cfg.rule(rel).orElseThrow(() -> CoverService.unprocessable("We can't add a " + CoverRules.label(rel) + " to a cover.")).multiplierBps());
            changed.add("relationship");
        }
        return changed;
    }

    @Transactional
    public PolicyDto removeMember(AppUser user, String policyId, String memberId) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        policy.activeMembers().stream().filter(x -> x.getId().equals(memberId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that family member on your cover.")).remove();
        recompute(policy);
        return toDto(policies.save(policy), false);
    }

    /**
     * Before cover has started a customer can simply withdraw: it is cancelled at once. Once cover has started, cancelling
     * is a request that staff confirm (they settle the date and any money owed either way).
     */
    @Transactional
    public PolicyDto requestCancel(AppUser user, String policyId, CancelRequestIn r) {
        Policy p = owned(user, policyId);
        if (!Set.of("pending_review", "approved", "active", "lapsed").contains(p.getStatus()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "This cover can't be cancelled.");
        if (p.getStartDate() == null) {
            p.setStatus("cancelled");
            p.markCancelled(today());
            audit.record("customer", "policy.withdrawn", "policy", p.getId(), "Withdrawn by the customer before cover started");
            return toDto(policies.save(p), false);
        }
        if (p.getCancelRequestedAt() == null) {
            p.requestCancel();
            support.save(new SupportRequest(user.getId(), "cancellation_request", p.getReference(),
                    "Customer asked to cancel cover " + p.getReference() + "." + (r != null && r.reason() != null ? " Reason: " + r.reason() + "." : "")
                            + (r != null && r.note() != null && !r.note().isBlank() ? " " + r.note().trim() : ""), user.getPhone()));
        }
        return toDto(policies.save(p), false);
    }

    @Transactional
    public PolicyDto keepCover(AppUser user, String policyId) {
        Policy p = owned(user, policyId);
        p.withdrawCancelRequest();
        resolveRequests(p, "cancellation_request", "Customer chose to keep their cover.");
        return toDto(policies.save(p), false);
    }

    /** A lapsed cover can be reinstated within the configured window, keeping its waiting periods. */
    @Transactional
    public PolicyDto requestReinstate(AppUser user, String policyId, ReinstateRequestIn r) {
        Policy p = owned(user, policyId);
        if (!"lapsed".equals(p.getStatus())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Only a lapsed cover can be reinstated.");
        CoverConfig cfg = cover.config();
        if (p.getLapsedAt() != null && !CoverRules.canReinstate(LocalDate.parse(p.getLapsedAt()), cfg.getReinstateWithinDays(), today()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The period to reinstate has passed. You'll need to apply again.");
        if (p.getReinstateRequestedAt() == null) {
            p.requestReinstate();
            support.save(new SupportRequest(user.getId(), "reinstatement_request", p.getReference(),
                    "Customer asked to reinstate lapsed cover " + p.getReference() + "." + (r != null && r.note() != null && !r.note().isBlank() ? " " + r.note().trim() : ""), user.getPhone()));
        }
        return toDto(policies.save(p), false);
    }

    private void resolveRequests(Policy p, String kind, String note) {
        support.findAllByOrderByCreatedAtDesc().stream()
                .filter(x -> kind.equals(x.getKind()) && p.getReference().equals(x.getOrderRef()) && !"resolved".equals(x.getStatus()))
                .forEach(x -> { x.setStatus("resolved", note); support.save(x); });
    }

    @Transactional(readOnly = true)
    public List<PolicyDto> list(AppUser user) { return policies.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(p -> toDto(p, false)).toList(); }

    @Transactional(readOnly = true)
    public PolicyDto get(AppUser user, String id) { return toDto(owned(user, id), false); }

    /** DebiCheck set-up. With no provider connected this says so plainly and changes nothing. */
    public DebitOrderState setUpDebitOrder(AppUser user, String id) {
        Policy p = owned(user, id);
        requireOpen(p);
        var result = debitOrders.requestMandate(p.getId(), p.getMonthlyTotalCents(), p.getDebitDay());
        if (result.state() == DebitOrderGateway.MandateRequest.State.NOT_CONFIGURED)
            return new DebitOrderState("not_configured", "Debit order set-up isn't switched on yet. Nothing has been set up and nothing will be collected. We'll tell you as soon as it's ready.");
        return new DebitOrderState("pending_customer_approval", "Please approve the debit order request in your banking app.");
    }

    // ---------------- staff ----------------

    @Transactional(readOnly = true)
    public List<AdminPolicyDto> adminList(String status) {
        List<Policy> list = status == null || status.isBlank() ? policies.findAllByOrderByCreatedAtDesc() : policies.findByStatusOrderByCreatedAtDesc(status);
        return list.stream().map(p -> new AdminPolicyDto(toDto(p, false), customer(p))).toList();
    }

    @Transactional
    public AdminPolicyDto adminGet(StaffUser staff, String id) {
        Policy p = policies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy."));
        audit.record(staff.getEmail(), "policy.viewed", "policy", id, "Full ID numbers displayed");
        return new AdminPolicyDto(toDto(p, true), customer(p));
    }

    @Transactional
    public AdminPolicyDto setStatus(StaffUser staff, String id, StatusChange c) {
        Policy p = policies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy."));
        if (!TRANSITIONS.getOrDefault(p.getStatus(), Set.of()).contains(c.status()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "A policy that is " + p.getStatus() + " can't be changed to " + c.status() + ".");
        if ("declined".equals(c.status()) && (c.note() == null || c.note().isBlank()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Please give a reason for declining.");
        String from = p.getStatus();
        p.setStatus(c.status());
        if ("lapsed".equals(c.status())) p.markLapsed(today());
        if ("cancelled".equals(c.status())) { p.markCancelled(today()); resolveRequests(p, "cancellation_request", "Cancelled by staff."); }
        audit.record(staff.getEmail(), "policy.status", "policy", id, from + " -> " + c.status() + (c.note() == null ? "" : ": " + c.note()));
        return new AdminPolicyDto(toDto(policies.save(p), true), customer(p));
    }

    /** Records a premium that was actually received outside the provider. Audited. It is how a policy first becomes active. */
    @Transactional
    public AdminPolicyDto recordPayment(StaffUser staff, String id, RecordPayment r) {
        Policy p = policies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy."));
        CoverConfig cfg = cover.config();
        LocalDate today = today();
        if (LocalDate.parse(r.paidOn()).isAfter(today)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "A payment can't be dated in the future.");
        switch (p.getStatus()) {
            case "pending_review" -> throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Approve the application before recording a payment.");
            case "declined", "cancelled" -> throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "This policy is " + p.getStatus() + ".");
            case "approved", "lapsed" -> {
                if ("lapsed".equals(p.getStatus()) && p.getLapsedAt() != null
                        && !CoverRules.canReinstate(LocalDate.parse(p.getLapsedAt()), cfg.getReinstateWithinDays(), today))
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The reinstatement period ended on " + CoverRules.reinstateUntil(LocalDate.parse(p.getLapsedAt()), cfg.getReinstateWithinDays()) + ". The customer needs to apply again.");
                if (r.amountCents() < p.getMonthlyTotalCents())
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The first premium is " + CoverRules.rand(p.getMonthlyTotalCents()) + ". A smaller amount can't start cover.");
            }
            default -> { }
        }
        payments.save(new PaymentRecord(p.getId(), r.amountCents(), r.paidOn(), "collected", "manual", r.reference().trim(), staff.getEmail()));
        if ("approved".equals(p.getStatus()) || "lapsed".equals(p.getStatus())) {
            p.activate(today, today.plusDays(cfg.getNaturalWaitingDays()));
            p.getMembers().stream().filter(m -> "active".equals(m.getStatus()) && m.getCoverStartsOn() == null)
                    .forEach(m -> m.setCoverStartsOn(p.getWaitingEndsOn()));
        }
        if ("active".equals(p.getStatus())) resolveRequests(p, "reinstatement_request", "Reinstated by a recorded payment.");
        audit.record(staff.getEmail(), "payment.recorded", "policy", id, CoverRules.rand(r.amountCents()) + " ref " + r.reference() + " (manual)");
        return new AdminPolicyDto(toDto(policies.save(p), true), customer(p));
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard(long openClaims) {
        List<Policy> all = policies.findAll();
        return new Dashboard(count(all, "pending_review"), count(all, "approved"), count(all, "active"), count(all, "lapsed"), openClaims,
                all.stream().filter(p -> "active".equals(p.getStatus())).mapToLong(Policy::getMonthlyTotalCents).sum(),
                all.stream().filter(p -> p.getCancelRequestedAt() != null && !"cancelled".equals(p.getStatus())).count(),
                all.stream().filter(p -> p.getReinstateRequestedAt() != null && "lapsed".equals(p.getStatus())).count());
    }

    // ---------------- helpers ----------------

    private static long count(List<Policy> all, String status) { return all.stream().filter(p -> status.equals(p.getStatus())).count(); }

    private List<QuoteMemberIn> memberQuote(Policy p) {
        return p.activeMembers().stream().map(m -> new QuoteMemberIn(m.getRelationship(), m.getDateOfBirth())).toList();
    }

    /**
     * Everyone's fee is the reference base price times their relationship factor times the factor for their CURRENT age,
     * so fees follow bundle changes and move up as people age into a higher band (when the cover is next recalculated).
     */
    void recompute(Policy policy) {
        CoverConfig cfg = cover.config();
        LocalDate today = today();
        long base = policy.getBaseMonthlyCents();
        int mainBps = cfg.ageMultiplierBps(CoverRules.age(LocalDate.parse(policy.getHolderDob()), today));
        long mainFee = CoverRules.personFee(base, 10000, mainBps);
        policy.setMainPricing(mainBps, mainFee);
        long total = mainFee;
        for (PolicyMember m : policy.activeMembers()) {
            int ageBps = cfg.ageMultiplierBps(CoverRules.age(LocalDate.parse(m.getDateOfBirth()), today));
            m.setPricing(CoverRules.personFee(base, m.getMultiplierBps(), ageBps), ageBps);
            total += m.getFeeCents();
        }
        policy.setMonthlyTotalCents(total);
    }

    private PolicyMember buildMember(CoverConfig cfg, MemberIn m, Set<String> usedIds, LocalDate today, String coverStartsOn) {
        LocalDate dob;
        try { dob = LocalDate.parse(m.dateOfBirth()); } catch (java.time.DateTimeException e) { throw CoverService.unprocessable("That date of birth doesn't look right."); }
        int age = CoverRules.age(dob, today);
        String id = m.idNumber() == null || m.idNumber().isBlank() ? null : m.idNumber();
        if (id == null && age >= 16) throw CoverService.unprocessable("Please add an ID number for " + m.fullName() + ".");
        if (id != null) {
            LocalDate fromId = SaId.dateOfBirth(id, today).orElseThrow(() -> CoverService.unprocessable("The ID number for " + m.fullName() + " doesn't look right."));
            if (!fromId.equals(dob)) throw CoverService.unprocessable("The date of birth for " + m.fullName() + " doesn't match their ID number.");
            if (!usedIds.add(id)) throw CoverService.unprocessable("That ID number is already on this cover.");
        }
        int mult = cfg.rule(m.relationship()).orElseThrow(() -> CoverService.unprocessable("We can't add a " + CoverRules.label(m.relationship()) + " to a cover.")).multiplierBps();
        return new PolicyMember(m.relationship(), m.fullName().trim(), id, dob.toString(), mult, 0, today.toString(), coverStartsOn);
    }

    private Policy owned(AppUser user, String id) {
        return policies.findByIdAndUserId(id, user.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that cover."));
    }

    private static void requireOpen(Policy p) {
        if (!Policy.OPEN_FOR_CHANGES.contains(p.getStatus())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "This cover can't be changed right now. Please contact us.");
    }

    private UserDto customer(Policy p) { return users.findById(p.getUserId()).map(AuthService::toDto).orElse(null); }

    private static String iso(java.time.Instant t) { return t == null ? null : DateTimeFormatter.ISO_INSTANT.format(t.atOffset(ZoneOffset.UTC)); }

    String nextDebitDate(Policy p) {
        if (!Set.of("approved", "active").contains(p.getStatus())) return null;
        LocalDate t = today();
        LocalDate next = t.getDayOfMonth() < p.getDebitDay() ? t.withDayOfMonth(Math.min(p.getDebitDay(), t.lengthOfMonth()))
                : t.plusMonths(1).withDayOfMonth(Math.min(p.getDebitDay(), t.plusMonths(1).lengthOfMonth()));
        return next.toString();
    }

    PolicyDto toDto(Policy p, boolean full) {
        List<MemberDto> members = p.getMembers().stream().filter(m -> "active".equals(m.getStatus())).map(m ->
                new MemberDto(m.getId(), m.getRelationship(), m.getFullName(), full ? m.getIdNumber() : SaId.mask(m.getIdNumber()), m.getDateOfBirth(),
                        m.getFeeCents(), m.getStatus(), m.getCoverStartsOn(), CoverRules.age(LocalDate.parse(m.getDateOfBirth()), today()), m.getMultiplierBps(), m.getAgeBps())).toList();
        List<PaymentDto> pays = new ArrayList<>();
        payments.findByPolicyIdOrderByCreatedAtDesc(p.getId()).forEach(x -> pays.add(new PaymentDto(x.getId(), x.getAmountCents(), x.getPaidOn(), x.getStatus(), x.getSource(), x.getReference())));
        List<BundleVersionDto> history = cover.versions(p);
        return new PolicyDto(p.getId(), p.getReference(), p.getStatus(),
                new HolderDto(p.getHolderName(), full ? p.getHolderIdNumber() : SaId.mask(p.getHolderIdNumber()), p.getHolderDob()),
                p.getDebitDay(), p.getMonthlyTotalCents(), p.getBaseMonthlyCents(), p.getMainFeeCents(), p.getMainAgeBps(),
                CoverRules.age(LocalDate.parse(p.getHolderDob()), today()), p.getMandateStatus(),
                DateTimeFormatter.ISO_INSTANT.format(p.getCreatedAt().atOffset(ZoneOffset.UTC)), p.getStartDate(), p.getWaitingEndsOn(),
                nextDebitDate(p), history.isEmpty() ? null : history.get(history.size() - 1), history, members, pays,
                p.getTermsVersion(), p.getPrivacyVersion(), p.getConsentAt() == null ? null : DateTimeFormatter.ISO_INSTANT.format(p.getConsentAt().atOffset(ZoneOffset.UTC)),
                p.getLapsedAt(), p.getLapsedAt() == null ? null : CoverRules.reinstateUntil(LocalDate.parse(p.getLapsedAt()), cover.config().getReinstateWithinDays()).toString(),
                p.getCancelledAt(), iso(p.getCancelRequestedAt()), iso(p.getReinstateRequestedAt()),
                p.getStartDate() != null && Set.of("active", "lapsed").contains(p.getStatus())
                        && CoverRules.withinCoolingOff(LocalDate.parse(p.getStartDate()), cover.config().getCoolingOffDays(), today()));
    }
}
