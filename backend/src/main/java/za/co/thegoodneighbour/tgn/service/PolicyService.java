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
    private final Clock clock;

    public PolicyService(PolicyRepository policies, PaymentRecordRepository payments, AppUserRepository users, CoverService cover,
                         AuditService audit, DebitOrderGateway debitOrders, LegalService legal, OtpService otp, Clock clock) {
        this.policies = policies; this.payments = payments; this.users = users; this.cover = cover; this.audit = audit;
        this.debitOrders = debitOrders; this.legal = legal; this.otp = otp; this.clock = clock;
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
        QuoteDto q = cover.quote(r.items(), members.stream().map(m -> new QuoteMemberIn(m.relationship(), m.dateOfBirth())).toList(), null);
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
        QuoteDto q = cover.quote(r.items(), memberQuote(policy), policy.getId());
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
        QuoteDto q = cover.quote(cur.lines().stream().map(l -> new BundleLineIn(l.itemId(), l.quantity())).toList(), all, policy.getId());
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

    @Transactional
    public PolicyDto removeMember(AppUser user, String policyId, String memberId) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        policy.activeMembers().stream().filter(x -> x.getId().equals(memberId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that family member on your cover.")).remove();
        recompute(policy);
        return toDto(policies.save(policy), false);
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
        audit.record(staff.getEmail(), "payment.recorded", "policy", id, CoverRules.rand(r.amountCents()) + " ref " + r.reference() + " (manual)");
        return new AdminPolicyDto(toDto(policies.save(p), true), customer(p));
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard(long openClaims) {
        List<Policy> all = policies.findAll();
        return new Dashboard(count(all, "pending_review"), count(all, "approved"), count(all, "active"), count(all, "lapsed"), openClaims,
                all.stream().filter(p -> "active".equals(p.getStatus())).mapToLong(Policy::getMonthlyTotalCents).sum());
    }

    // ---------------- helpers ----------------

    private static long count(List<Policy> all, String status) { return all.stream().filter(p -> status.equals(p.getStatus())).count(); }

    private List<QuoteMemberIn> memberQuote(Policy p) {
        return p.activeMembers().stream().map(m -> new QuoteMemberIn(m.getRelationship(), m.getDateOfBirth())).toList();
    }

    /** Fees are the main member's premium times each relationship's multiplier, so they follow bundle changes. */
    void recompute(Policy policy) {
        long base = policy.getBaseMonthlyCents();
        long total = base;
        for (PolicyMember m : policy.activeMembers()) {
            m.setFeeCents(CoverRules.memberFee(base, m.getMultiplierBps()));
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
                        m.getFeeCents(), m.getStatus(), m.getCoverStartsOn())).toList();
        List<PaymentDto> pays = new ArrayList<>();
        payments.findByPolicyIdOrderByCreatedAtDesc(p.getId()).forEach(x -> pays.add(new PaymentDto(x.getId(), x.getAmountCents(), x.getPaidOn(), x.getStatus(), x.getSource(), x.getReference())));
        List<BundleVersionDto> history = cover.versions(p);
        return new PolicyDto(p.getId(), p.getReference(), p.getStatus(),
                new HolderDto(p.getHolderName(), full ? p.getHolderIdNumber() : SaId.mask(p.getHolderIdNumber()), p.getHolderDob()),
                p.getDebitDay(), p.getMonthlyTotalCents(), p.getBaseMonthlyCents(), p.getMandateStatus(),
                DateTimeFormatter.ISO_INSTANT.format(p.getCreatedAt().atOffset(ZoneOffset.UTC)), p.getStartDate(), p.getWaitingEndsOn(),
                nextDebitDate(p), history.isEmpty() ? null : history.get(history.size() - 1), history, members, pays);
    }
}
