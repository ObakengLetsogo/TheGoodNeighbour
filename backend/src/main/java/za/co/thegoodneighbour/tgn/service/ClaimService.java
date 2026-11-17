package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.repo.ClaimRepository;
import za.co.thegoodneighbour.tgn.repo.PolicyRepository;

@Service
public class ClaimService {
    static final Set<String> OPEN = Set.of("submitted", "under_review");
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "submitted", Set.of("under_review", "declined"),
            "under_review", Set.of("approved", "declined"),
            "approved", Set.of("delivered"));

    private final ClaimRepository claims;
    private final PolicyRepository policies;
    private final CoverService cover;
    private final AuditService audit;
    private final Clock clock;

    public ClaimService(ClaimRepository claims, PolicyRepository policies, CoverService cover, AuditService audit, Clock clock) {
        this.claims = claims; this.policies = policies; this.cover = cover; this.audit = audit; this.clock = clock;
    }

    @Transactional
    public ClaimDto submit(AppUser user, ClaimIn in) {
        Policy policy = policies.findByIdAndUserId(in.policyId(), user.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that cover."));
        if (!Set.of("active", "lapsed").contains(policy.getStatus()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Cover isn't active yet. Please call us and we'll help.");
        CoverConfig cfg = cover.config();
        LocalDate today = LocalDate.now(clock);
        LocalDate died;
        try { died = LocalDate.parse(in.dateOfDeath()); } catch (java.time.DateTimeException e) { throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That date doesn't look right."); }
        if (died.isAfter(today)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The date of passing can't be in the future.");

        boolean accidental = "accidental".equals(in.causeOfDeath());
        LocalDate start = LocalDate.parse(policy.getStartDate());
        String name, relationship = null, memberId = null;
        LocalDate dob, coverFrom;
        if (in.memberId() == null || in.memberId().isBlank()) {
            name = policy.getHolderName(); dob = LocalDate.parse(policy.getHolderDob());
            coverFrom = accidental ? start.plusDays(cfg.getAccidentalWaitingDays()) : LocalDate.parse(policy.getWaitingEndsOn());
        } else {
            PolicyMember m = policy.activeMembers().stream().filter(x -> x.getId().equals(in.memberId())).findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That person isn't on this cover."));
            name = m.getFullName(); relationship = m.getRelationship(); memberId = m.getId(); dob = LocalDate.parse(m.getDateOfBirth());
            LocalDate joined = LocalDate.parse(m.getAddedOn());
            LocalDate from = joined.isAfter(start) ? joined : start;
            coverFrom = accidental ? from.plusDays(cfg.getAccidentalWaitingDays()) : LocalDate.parse(m.getCoverStartsOn());
        }
        boolean within = died.isBefore(coverFrom);
        boolean over = CoverRules.overAgeLimit(cfg, relationship, CoverRules.age(dob, died));
        BundleVersionDto owed = cover.applicable(policy, died, in.causeOfDeath());
        DeliveryIn d = in.delivery();
        Claim c = claims.save(new Claim(policy.getId(), user.getId(), memberId, name, died.toString(), in.causeOfDeath(), in.claimantName().trim(),
                in.claimantPhone(), within, over, cover.writeOne(owed),
                new Claim.Delivery(d.recipientName().trim(), d.recipientPhone(), d.addressLine().trim(), d.suburb().trim(), d.city().trim(), d.province(), d.postalCode(), d.instructions())));
        return toDto(c, policy.getReference());
    }

    @Transactional(readOnly = true)
    public List<ClaimDto> list(AppUser user) { return claims.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(c -> toDto(c, ref(c))).toList(); }

    @Transactional(readOnly = true)
    public List<ClaimDto> adminList() { return claims.findAllByOrderByCreatedAtDesc().stream().map(c -> toDto(c, ref(c))).toList(); }

    @Transactional(readOnly = true)
    public long openCount() { return claims.findAll().stream().filter(c -> OPEN.contains(c.getStatus())).count(); }

    @Transactional
    public ClaimDto setStatus(StaffUser staff, String id, StatusChange change) {
        Claim c = claims.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that claim."));
        if (!TRANSITIONS.getOrDefault(c.getStatus(), Set.of()).contains(change.status()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "A claim that is " + c.getStatus() + " can't be changed to " + change.status() + ".");
        if ("declined".equals(change.status()) && (change.note() == null || change.note().isBlank()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Please give a reason for declining.");
        String from = c.getStatus();
        c.setStatus(change.status(), change.note());
        audit.record(staff.getEmail(), "claim.status", "claim", id, from + " -> " + change.status() + (change.note() == null ? "" : ": " + change.note()));
        return toDto(claims.save(c), ref(c));
    }

    private String ref(Claim c) { return policies.findById(c.getPolicyId()).map(Policy::getReference).orElse(""); }
    private static String iso(java.time.Instant t) { return DateTimeFormatter.ISO_INSTANT.format(t.atOffset(ZoneOffset.UTC)); }

    private ClaimDto toDto(Claim c, String policyRef) {
        Claim.Delivery d = c.getDelivery();
        return new ClaimDto(c.getId(), c.getReference(), c.getPolicyId(), policyRef, c.getDeceasedName(), c.getDateOfDeath(), c.getCauseOfDeath(),
                c.getClaimantName(), c.getClaimantPhone(), c.getStatus(), c.isWithinWaitingPeriod(), c.isOverAgeLimit(), c.getStaffNote(),
                new DeliveryIn(d.recipientName(), d.recipientPhone(), d.addressLine(), d.suburb(), d.city(), d.province(), d.postalCode(), d.instructions()),
                cover.readOne(c.getBundleJson()), iso(c.getCreatedAt()), iso(c.getUpdatedAt()));
    }
}
