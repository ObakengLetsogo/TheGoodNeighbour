package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.payment.DebitOrderGateway;
import za.co.thegoodneighbour.tgn.repo.*;

@Service
public class PolicyService {
    static final Set<Integer> DEBIT_DAYS = Set.of(1, 7, 15, 25);
    /** Allowed staff-driven status changes. Activation is not here: it only follows a recorded payment. */
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "pending_review", Set.of("approved", "declined"),
            "approved", Set.of("cancelled"),
            "active", Set.of("lapsed", "cancelled"),
            "lapsed", Set.of("cancelled"));

    private final PolicyRepository policies;
    private final PlanRepository plans;
    private final PaymentRecordRepository payments;
    private final AppUserRepository users;
    private final AuditService audit;
    private final DebitOrderGateway debitOrders;
    private final Clock clock;

    public PolicyService(PolicyRepository policies, PlanRepository plans, PaymentRecordRepository payments, AppUserRepository users,
                         AuditService audit, DebitOrderGateway debitOrders, Clock clock) {
        this.policies = policies; this.plans = plans; this.payments = payments; this.users = users; this.audit = audit;
        this.debitOrders = debitOrders; this.clock = clock;
    }

    private LocalDate today() { return LocalDate.now(clock); }

    // ---------------- customer ----------------

    @Transactional
    public PolicyDto apply(AppUser user, ApplyRequest r) {
        LocalDate today = today();
        Plan plan = plans.findById(r.planId()).filter(Plan::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That plan isn't available right now."));
        if (policies.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().anyMatch(p -> Policy.OPEN_FOR_CHANGES.contains(p.getStatus())))
            throw new ApiException(HttpStatus.CONFLICT, "You already have a plan in progress. You can add family members to it instead.");
        if (!DEBIT_DAYS.contains(r.debitDay())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Please choose one of the available debit dates.");

        LocalDate dob = SaId.dateOfBirth(r.holderIdNumber(), today)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That ID number doesn't look right. Please check it and try again."));
        int age = PlanRules.age(dob, today);
        if (age < plan.getMinAge() || age > plan.getMaxAge())
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "This plan is for people aged " + plan.getMinAge() + " to " + plan.getMaxAge() + ".");

        Policy policy = new Policy(user.getId(), plan.getId(), user.getFullName(), r.holderIdNumber(), dob.toString(), r.debitDay());
        for (MemberIn m : r.members() == null ? List.<MemberIn>of() : r.members()) policy.addMember(buildMember(plan, policy, m, today, null));
        policy.setMonthlyTotalCents(PlanRules.monthlyTotal(plan, policy.activeMembers()));
        return toDto(policies.save(policy), plan, false);
    }

    @Transactional
    public PolicyDto addMember(AppUser user, String policyId, MemberIn m) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        Plan plan = plan(policy);
        String coverStart = "active".equals(policy.getStatus()) ? today().plusDays(plan.getWaitingPeriodDays()).toString() : null;
        policy.addMember(buildMember(plan, policy, m, today(), coverStart));
        policy.setMonthlyTotalCents(PlanRules.monthlyTotal(plan, policy.activeMembers()));
        return toDto(policies.save(policy), plan, false);
    }

    @Transactional
    public PolicyDto removeMember(AppUser user, String policyId, String memberId) {
        Policy policy = owned(user, policyId);
        requireOpen(policy);
        PolicyMember member = policy.activeMembers().stream().filter(x -> x.getId().equals(memberId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that family member on your plan."));
        member.remove();
        Plan plan = plan(policy);
        policy.setMonthlyTotalCents(PlanRules.monthlyTotal(plan, policy.activeMembers()));
        return toDto(policies.save(policy), plan, false);
    }

    @Transactional(readOnly = true)
    public List<PolicyDto> list(AppUser user) {
        return policies.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(p -> toDto(p, plan(p), false)).toList();
    }

    @Transactional(readOnly = true)
    public PolicyDto get(AppUser user, String id) {
        Policy p = owned(user, id);
        return toDto(p, plan(p), false);
    }

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
        return list.stream().map(p -> new AdminPolicyDto(toDto(p, plan(p), false), customer(p))).toList();
    }

    @Transactional
    public AdminPolicyDto adminGet(StaffUser staff, String id) {
        Policy p = policies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy."));
        audit.record(staff.getEmail(), "policy.viewed", "policy", id, "Full ID numbers displayed");
        return new AdminPolicyDto(toDto(p, plan(p), true), customer(p));
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
        return new AdminPolicyDto(toDto(policies.save(p), plan(p), true), customer(p));
    }

    /** Records a premium that was actually received outside the provider. It is audited, and it is how a policy first becomes active. */
    @Transactional
    public AdminPolicyDto recordPayment(StaffUser staff, String id, RecordPayment r) {
        Policy p = policies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy."));
        Plan plan = plan(p);
        LocalDate today = today();
        if (LocalDate.parse(r.paidOn()).isAfter(today)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "A payment can't be dated in the future.");
        switch (p.getStatus()) {
            case "pending_review" -> throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Approve the application before recording a payment.");
            case "declined", "cancelled" -> throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "This policy is " + p.getStatus() + ".");
            case "approved", "lapsed" -> {
                if (r.amountCents() < p.getMonthlyTotalCents())
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The first premium is " + p.getMonthlyTotalCents() / 100 + " rand. A smaller amount can't start cover.");
            }
            default -> { }
        }
        payments.save(new PaymentRecord(p.getId(), r.amountCents(), r.paidOn(), "collected", "manual", r.reference().trim(), staff.getEmail()));
        if ("approved".equals(p.getStatus()) || "lapsed".equals(p.getStatus())) {
            LocalDate waitingEnds = today.plusDays(plan.getWaitingPeriodDays());
            p.activate(today, waitingEnds);
            p.getMembers().stream().filter(m -> "active".equals(m.getStatus()) && m.getCoverStartsOn() == null)
                    .forEach(m -> m.setCoverStartsOn(p.getWaitingEndsOn()));
        }
        audit.record(staff.getEmail(), "payment.recorded", "policy", id, "R" + r.amountCents() / 100 + " ref " + r.reference() + " (manual)");
        return new AdminPolicyDto(toDto(policies.save(p), plan, true), customer(p));
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard(long openClaims) {
        List<Policy> all = policies.findAll();
        long active = all.stream().filter(p -> "active".equals(p.getStatus())).count();
        return new Dashboard(count(all, "pending_review"), count(all, "approved"), active, count(all, "lapsed"), openClaims,
                all.stream().filter(p -> "active".equals(p.getStatus())).mapToLong(Policy::getMonthlyTotalCents).sum());
    }

    // ---------------- helpers ----------------

    private static long count(List<Policy> all, String status) { return all.stream().filter(p -> status.equals(p.getStatus())).count(); }

    private PolicyMember buildMember(Plan plan, Policy policy, MemberIn m, LocalDate today, String coverStartsOn) {
        LocalDate dob = parseDate(m.dateOfBirth());
        long existing = policy.activeMembers().stream().filter(x -> x.getType().equals(m.type())).count();
        Plan.MemberRule rule = PlanRules.checkMember(plan, m.type(), dob, existing, today);
        if (m.idNumber() != null && !m.idNumber().isBlank()) {
            LocalDate fromId = SaId.dateOfBirth(m.idNumber(), today)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The ID number for " + m.fullName() + " doesn't look right."));
            if (!fromId.equals(dob)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The date of birth for " + m.fullName() + " doesn't match their ID number.");
        }
        String id = m.idNumber() == null || m.idNumber().isBlank() ? null : m.idNumber();
        return new PolicyMember(m.type(), m.fullName().trim(), id, dob.toString(), rule.feeCents(), rule.coverCents(), today.toString(), coverStartsOn);
    }

    private static LocalDate parseDate(String s) {
        try { return LocalDate.parse(s); }
        catch (java.time.DateTimeException e) { throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That date doesn't look right."); }
    }

    private Policy owned(AppUser user, String id) {
        return policies.findByIdAndUserId(id, user.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that plan."));
    }

    private static void requireOpen(Policy p) {
        if (!Policy.OPEN_FOR_CHANGES.contains(p.getStatus())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "This plan can't be changed right now. Please contact us.");
    }

    private Plan plan(Policy p) {
        return plans.findById(p.getPlanId()).orElseThrow(() -> new IllegalStateException("Missing plan " + p.getPlanId()));
    }

    private UserDto customer(Policy p) {
        return users.findById(p.getUserId()).map(AuthService::toDto).orElse(null);
    }

    String nextDebitDate(Policy p) {
        if (!Set.of("approved", "active").contains(p.getStatus())) return null;
        LocalDate t = today();
        LocalDate next = t.getDayOfMonth() < p.getDebitDay() ? t.withDayOfMonth(Math.min(p.getDebitDay(), t.lengthOfMonth()))
                : t.plusMonths(1).withDayOfMonth(Math.min(p.getDebitDay(), t.plusMonths(1).lengthOfMonth()));
        return next.toString();
    }

    PolicyDto toDto(Policy p, Plan plan, boolean full) {
        List<MemberDto> members = p.getMembers().stream().filter(m -> "active".equals(m.getStatus())).map(m ->
                new MemberDto(m.getId(), m.getType(), m.getFullName(), full ? m.getIdNumber() : SaId.mask(m.getIdNumber()), m.getDateOfBirth(),
                        m.getFeeCents(), m.getCoverCents(), m.getStatus(), m.getCoverStartsOn())).toList();
        List<PaymentDto> pays = new ArrayList<>();
        payments.findByPolicyIdOrderByCreatedAtDesc(p.getId()).forEach(x -> pays.add(new PaymentDto(x.getId(), x.getAmountCents(), x.getPaidOn(), x.getStatus(), x.getSource(), x.getReference())));
        return new PolicyDto(p.getId(), p.getReference(), plan.getId(), plan.getName(), plan.getCoverCents(), p.getStatus(),
                new HolderDto(p.getHolderName(), full ? p.getHolderIdNumber() : SaId.mask(p.getHolderIdNumber()), p.getHolderDob()),
                p.getDebitDay(), p.getMonthlyTotalCents(), p.getMandateStatus(),
                DateTimeFormatter.ISO_INSTANT.format(p.getCreatedAt().atOffset(ZoneOffset.UTC)), p.getStartDate(), p.getWaitingEndsOn(),
                nextDebitDate(p), members, pays);
    }
}
