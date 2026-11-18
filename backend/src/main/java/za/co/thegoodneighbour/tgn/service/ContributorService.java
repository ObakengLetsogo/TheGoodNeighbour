package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.repo.*;

/**
 * Family plans: several people share the monthly cost of one cover (siblings paying towards their parents, for example).
 * One person owns the plan. Others are invited by phone number, accept with a verified number, and pay a percentage of the
 * monthly price; the owner pays the rest, so the shares always add up when the price changes. Whether the cover stays
 * active depends on the plan as a whole, never on one person.
 */
@Service
public class ContributorService {
    static final int MAX_CONTRIBUTORS = 6;
    /** The owner always keeps at least this much of the cost (5%). */
    static final int OWNER_MIN_BPS = 500;
    private static final Set<String> LIVE = Set.of(PolicyContributor.INVITED, PolicyContributor.ACTIVE);

    private final PolicyContributorRepository contributors;
    private final PolicyRepository policies;
    private final PaymentRecordRepository payments;
    private final AppUserRepository users;
    private final CoverService cover;
    private final NotificationService inbox;
    private final AuditService audit;
    private final Clock clock;

    public ContributorService(PolicyContributorRepository contributors, PolicyRepository policies, PaymentRecordRepository payments, AppUserRepository users,
                              CoverService cover, NotificationService inbox, AuditService audit, Clock clock) {
        this.contributors = contributors; this.policies = policies; this.payments = payments; this.users = users;
        this.cover = cover; this.inbox = inbox; this.audit = audit; this.clock = clock;
    }

    // ---------------- the owner's side ----------------

    @Transactional
    public void invite(AppUser owner, String policyId, InviteContributorIn in) {
        Policy p = owned(owner, policyId);
        if (!Policy.OPEN_FOR_CHANGES.contains(p.getStatus())) throw unprocessable("This cover can't be changed right now. Please contact us.");
        if (in.phone().equals(owner.getPhone())) throw unprocessable("That's your own number. You already pay your share.");
        List<PolicyContributor> live = contributors.findByPolicyIdOrderByInvitedAtAsc(policyId).stream().filter(c -> LIVE.contains(c.getStatus())).toList();
        if (live.size() >= MAX_CONTRIBUTORS) throw unprocessable("A plan can have up to " + MAX_CONTRIBUTORS + " people sharing the cost.");
        if (live.stream().anyMatch(c -> c.getPhone().equals(in.phone()))) throw unprocessable("That person is already invited to this plan.");
        int bps = in.sharePercent() * 100;
        if (sum(live) + bps > 10000 - OWNER_MIN_BPS) throw unprocessable("The shares add up to too much. You keep at least " + OWNER_MIN_BPS / 100 + "% of the cost.");
        PolicyContributor c = contributors.save(new PolicyContributor(policyId, in.phone(), in.name().trim(), bps));
        users.findByPhone(in.phone()).ifPresent(u -> inbox.notify(u.getId(), "cover", "You're invited to share a family plan",
                owner.getFullName() + " has asked you to share the cost of a family funeral plan. Open Shared Plans to see it.", "invitation", c.getId()));
        audit.record("customer", "contributor.invited", "policy", policyId, in.name().trim() + " at " + in.sharePercent() + "%");
    }

    @Transactional
    public void removeContributor(AppUser owner, String policyId, String contributorId) {
        Policy p = owned(owner, policyId);
        PolicyContributor c = contributors.findById(contributorId).filter(x -> x.getPolicyId().equals(policyId) && LIVE.contains(x.getStatus()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that person on your plan."));
        c.remove();
        if (c.getUserId() != null) inbox.notify(c.getUserId(), "cover", "You were removed from a family plan",
                owner.getFullName() + " removed you from the plan " + p.getReference() + ". You won't be asked to pay towards it.", "policy", null);
        audit.record("customer", "contributor.removed", "policy", policyId, c.getName());
    }

    // ---------------- the invited person's side ----------------

    @Transactional(readOnly = true)
    public InvitationsDto invitations(AppUser u) {
        List<PolicyContributor> pending = contributors.findByPhoneAndStatus(u.getPhone(), PolicyContributor.INVITED);
        // Invitations are matched by phone number, so we only show them once that number is verified as theirs.
        if (!u.isPhoneVerified()) return new InvitationsDto(!pending.isEmpty(), List.of());
        return new InvitationsDto(false, pending.stream().map(this::invitation).flatMap(Optional::stream).toList());
    }

    @Transactional
    public SharedPolicyDto accept(AppUser u, String id) {
        requireVerified(u);
        PolicyContributor c = invitationFor(u, id);
        Policy p = policy(c.getPolicyId());
        if (!Policy.OPEN_FOR_CHANGES.contains(p.getStatus())) throw unprocessable("This plan is no longer open.");
        if (sum(active(c.getPolicyId())) + c.getShareBps() > 10000 - OWNER_MIN_BPS)
            throw unprocessable("The shares on this plan are full. Please ask the owner to adjust them.");
        c.accept(u.getId());
        inbox.notify(p.getUserId(), "cover", u.getFullName() + " joined your plan",
                "They will pay " + c.getShareBps() / 100 + "% of the monthly price, about " + CoverRules.rand(share(p.getMonthlyTotalCents(), c.getShareBps())) + ".", "policy", p.getId());
        return sharedDto(u, c);
    }

    @Transactional
    public void decline(AppUser u, String id) {
        PolicyContributor c = invitationFor(u, id);
        c.decline();
        policies.findById(c.getPolicyId()).ifPresent(p -> inbox.notify(p.getUserId(), "cover", "An invitation was declined",
                c.getName() + " can't share the cost of your plan right now.", "policy", p.getId()));
    }

    @Transactional
    public void leave(AppUser u, String id) {
        PolicyContributor c = mine(u, id);
        c.leave();
        Policy p = policy(c.getPolicyId());
        inbox.notify(p.getUserId(), "cover", c.getName() + " left your plan", "Their share of " + c.getShareBps() / 100 + "% now comes back to you. Open your cover to see the new split.", "policy", p.getId());
        audit.record("customer", "contributor.left", "policy", p.getId(), c.getName());
    }

    /** A contributor can raise or lower their own share any time, within what the plan has room for. Nobody else can change it. */
    @Transactional
    public SharedPolicyDto updateMyShare(AppUser u, String id, int percent) {
        PolicyContributor c = mine(u, id);
        int bps = percent * 100;
        int others = sum(active(c.getPolicyId())) - c.getShareBps();
        if (others + bps > 10000 - OWNER_MIN_BPS) throw unprocessable("The shares on this plan are full. The most you can take is " + Math.max(0, (10000 - OWNER_MIN_BPS - others) / 100) + "%.");
        c.setShareBps(bps);
        Policy p = policy(c.getPolicyId());
        inbox.notify(p.getUserId(), "cover", c.getName() + " changed their share", "They now pay " + percent + "% of the monthly price. Your share is " + ownerShareBps(p) / 100 + "%.", "policy", p.getId());
        return sharedDto(u, c);
    }

    @Transactional(readOnly = true)
    public List<SharedPolicyDto> shared(AppUser u) {
        return contributors.findByUserIdAndStatus(u.getId(), PolicyContributor.ACTIVE).stream().map(c -> sharedDto(u, c)).toList();
    }

    // ---------------- used by the policy and payment code ----------------

    @Transactional(readOnly = true)
    public List<ContributorDto> contributorsOf(Policy p, boolean includePhone) {
        long total = p.getMonthlyTotalCents();
        return contributors.findByPolicyIdOrderByInvitedAtAsc(p.getId()).stream().filter(c -> LIVE.contains(c.getStatus()))
                .map(c -> new ContributorDto(c.getId(), c.getName(), includePhone ? c.getPhone() : null, c.getStatus(), c.getShareBps(),
                        share(total, c.getShareBps()), c.getUserId() == null ? 0 : paidThisMonth(p, c.getUserId()))).toList();
    }

    public boolean hasActiveContributors(Policy p) { return !active(p.getId()).isEmpty(); }

    /** The owner pays whatever the active contributors don't. */
    public int ownerShareBps(Policy p) { return 10000 - sum(active(p.getId())); }

    public long ownerShareCents(Policy p) {
        long others = active(p.getId()).stream().mapToLong(c -> share(p.getMonthlyTotalCents(), c.getShareBps())).sum();
        return Math.max(0, p.getMonthlyTotalCents() - others);
    }

    /** Collected less reversed, this calendar month, for one person (null means the plan's owner). */
    public long paidThisMonth(Policy p, String contributorUserId) {
        String month = LocalDate.now(clock).toString().substring(0, 7);
        return payments.findByPolicyIdOrderByCreatedAtDesc(p.getId()).stream()
                .filter(x -> x.getPaidOn() != null && x.getPaidOn().startsWith(month))
                .filter(x -> contributorUserId == null ? (x.getContributorUserId() == null || x.getContributorUserId().equals(p.getUserId())) : contributorUserId.equals(x.getContributorUserId()))
                .mapToLong(x -> "collected".equals(x.getStatus()) ? x.getAmountCents() : "reversed".equals(x.getStatus()) ? -x.getAmountCents() : 0).sum();
    }

    /** Names for the payment history: contributor user id to the name the owner gave them. */
    public java.util.Map<String, String> payerNames(Policy p) {
        java.util.Map<String, String> out = new java.util.HashMap<>();
        contributors.findByPolicyIdOrderByInvitedAtAsc(p.getId()).stream().filter(c -> c.getUserId() != null).forEach(c -> out.put(c.getUserId(), c.getName()));
        return out;
    }

    /** The contributor row for a staff-recorded payment, checked to belong to this plan and be active. */
    public PolicyContributor activeContributor(Policy p, String contributorId) {
        return contributors.findById(contributorId).filter(c -> c.getPolicyId().equals(p.getId()) && PolicyContributor.ACTIVE.equals(c.getStatus()))
                .orElseThrow(() -> unprocessable("That person isn't sharing this plan."));
    }

    /** Everyone who should hear about the plan: the owner and the active contributors. */
    public List<String> audience(Policy p) {
        java.util.ArrayList<String> out = new java.util.ArrayList<>();
        out.add(p.getUserId());
        active(p.getId()).forEach(c -> { if (c.getUserId() != null && !out.contains(c.getUserId())) out.add(c.getUserId()); });
        return out;
    }

    public void notifyAll(Policy p, String category, String title, String body) { audience(p).forEach(uid -> inbox.notify(uid, category, title, body, "policy", p.getId())); }

    /** Tells everyone on the plan who paid what, so nobody has to ask in the family WhatsApp group. */
    public void onPayment(Policy p, PaymentRecord pay) {
        String payerId = pay.getContributorUserId() == null ? p.getUserId() : pay.getContributorUserId();
        String payerName = payerId.equals(p.getUserId()) ? users.findById(p.getUserId()).map(AppUser::getFullName).orElse("The plan owner") : payerNames(p).getOrDefault(payerId, "A family member");
        for (String uid : audience(p)) {
            if (uid.equals(payerId)) inbox.notify(uid, "payment", "Payment received", "We received " + CoverRules.rand(pay.getAmountCents()) + " from you. Thank you.", "policy", p.getId());
            else inbox.notify(uid, "payment", "Payment received", payerName + " paid " + CoverRules.rand(pay.getAmountCents()) + " towards the plan.", "policy", p.getId());
        }
    }

    // ---------------- internals ----------------

    private Optional<InvitationDto> invitation(PolicyContributor c) {
        Policy p = policies.findById(c.getPolicyId()).orElse(null);
        if (p == null || !Policy.OPEN_FOR_CHANGES.contains(p.getStatus())) return Optional.empty();
        String owner = users.findById(p.getUserId()).map(AppUser::getFullName).orElse("A family member");
        return Optional.of(new InvitationDto(c.getId(), owner, c.getShareBps(), share(p.getMonthlyTotalCents(), c.getShareBps()), p.getMonthlyTotalCents(),
                summary(cover.current(p).lines()), p.activeMembers().size() + (p.isCoverMainMember() ? 1 : 0), DateTimeFormatter.ISO_INSTANT.format(c.getInvitedAt().atOffset(ZoneOffset.UTC))));
    }

    private SharedPolicyDto sharedDto(AppUser u, PolicyContributor c) {
        Policy p = policy(c.getPolicyId());
        String owner = users.findById(p.getUserId()).map(AppUser::getFullName).orElse("A family member");
        LocalDate today = LocalDate.now(clock);
        List<SharedMemberDto> members = new java.util.ArrayList<>();
        if (p.isCoverMainMember()) members.add(new SharedMemberDto("main", p.getHolderName(), CoverRules.age(LocalDate.parse(p.getHolderDob()), today)));
        p.activeMembers().forEach(m -> members.add(new SharedMemberDto(m.getRelationship(), m.getFullName(), CoverRules.age(LocalDate.parse(m.getDateOfBirth()), today))));
        return new SharedPolicyDto(c.getId(), p.getId(), p.getReference(), owner, p.getStatus(), p.getMonthlyTotalCents(), c.getShareBps(),
                share(p.getMonthlyTotalCents(), c.getShareBps()), paidThisMonth(p, u.getId()), nextDebit(p), cover.current(p).lines(), members,
                contributorsOf(p, false), ownerShareBps(p), ownerShareCents(p), paidThisMonth(p, null));
    }

    private String nextDebit(Policy p) {
        if (!Set.of("approved", "active").contains(p.getStatus())) return null;
        LocalDate t = LocalDate.now(clock);
        LocalDate next = t.getDayOfMonth() < p.getDebitDay() ? t.withDayOfMonth(Math.min(p.getDebitDay(), t.lengthOfMonth()))
                : t.plusMonths(1).withDayOfMonth(Math.min(p.getDebitDay(), t.plusMonths(1).lengthOfMonth()));
        return next.toString();
    }

    private static String summary(List<BundleLineDto> lines) {
        return String.join(", ", lines.stream().map(l -> l.quantity() > 1 ? l.quantity() + " × " + l.name() : l.name()).toList());
    }

    private PolicyContributor invitationFor(AppUser u, String id) {
        return contributors.findById(id).filter(c -> PolicyContributor.INVITED.equals(c.getStatus()) && c.getPhone().equals(u.getPhone()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that invitation."));
    }

    private PolicyContributor mine(AppUser u, String id) {
        return contributors.findById(id).filter(c -> PolicyContributor.ACTIVE.equals(c.getStatus()) && u.getId().equals(c.getUserId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that plan."));
    }

    private static void requireVerified(AppUser u) {
        if (!u.isPhoneVerified()) throw unprocessable("Please verify your mobile number first. We use it to make sure invitations reach the right person.");
    }

    private List<PolicyContributor> active(String policyId) {
        return contributors.findByPolicyIdOrderByInvitedAtAsc(policyId).stream().filter(c -> PolicyContributor.ACTIVE.equals(c.getStatus())).toList();
    }

    private static int sum(List<PolicyContributor> list) { return list.stream().mapToInt(PolicyContributor::getShareBps).sum(); }
    static long share(long total, int bps) { return Math.round(total * bps / 10000.0); }

    private Policy owned(AppUser u, String id) {
        return policies.findByIdAndUserId(id, u.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that cover."));
    }
    private Policy policy(String id) { return policies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that plan.")); }
    private static ApiException unprocessable(String m) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, m); }
}
