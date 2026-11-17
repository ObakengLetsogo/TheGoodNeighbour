package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.repo.ClaimDocumentRepository;
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
    private final ClaimDocumentRepository documents;
    private final DocumentStore store;
    private final Clock clock;

    public ClaimService(ClaimRepository claims, PolicyRepository policies, CoverService cover, AuditService audit, ClaimDocumentRepository documents,
                        DocumentStore store, Clock clock) {
        this.claims = claims; this.policies = policies; this.cover = cover; this.audit = audit; this.documents = documents; this.store = store; this.clock = clock;
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
                in.claimantPhone(), within, over, CoverRules.age(dob, died) >= 16, cover.writeOne(owed),
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
        if ("approved".equals(change.status()) && missing(c).contains("death_certificate"))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The death certificate is required before this claim can be approved.");
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
                cover.readOne(c.getBundleJson()), iso(c.getCreatedAt()), iso(c.getUpdatedAt()),
                documents.findByClaimIdOrderByCreatedAtAsc(c.getId()).stream().map(ClaimService::toDto).toList(), missing(c));
    }

    // ---------------- documents ----------------

    static final long MAX_BYTES = 5L * 1024 * 1024;
    static final int MAX_FILES = 10;

    /** Documents still needed: a death certificate always, and a copy of the deceased's ID when they were 16 or older. */
    List<String> missing(Claim c) {
        Set<String> have = new java.util.HashSet<>();
        documents.findByClaimIdOrderByCreatedAtAsc(c.getId()).forEach(d -> have.add(d.getDocType()));
        List<String> out = new ArrayList<>();
        if (!have.contains("death_certificate")) out.add("death_certificate");
        if (c.isDeceasedIdRequired() && !have.contains("deceased_id")) out.add("deceased_id");
        return out;
    }

    @Transactional
    public ClaimDocumentDto addDocument(AppUser user, String claimId, String type, MultipartFile file) throws java.io.IOException {
        Claim c = claims.findById(claimId).filter(x -> x.getUserId().equals(user.getId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that claim."));
        if (!OPEN.contains(c.getStatus())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Documents can't be added to this claim any more. Please contact us.");
        if (!ClaimDocument.TYPES.contains(type)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Please say what kind of document this is.");
        if (file == null || file.isEmpty()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That file is empty.");
        if (file.getSize() > MAX_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "That file is too big. The limit is 5 MB.");
        if (documents.findByClaimIdOrderByCreatedAtAsc(claimId).size() >= MAX_FILES) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "You can add up to " + MAX_FILES + " documents to a claim.");
        byte[] bytes = file.getBytes();
        String contentType = detect(bytes);   // from the file's real contents, never from what the client claims
        if (contentType == null) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "We can only accept PDF, JPEG or PNG files.");
        ClaimDocument d = documents.save(new ClaimDocument(claimId, type, cleanName(file.getOriginalFilename(), contentType), contentType, bytes.length, store.save(bytes)));
        return toDto(d);
    }

    @Transactional
    public void removeDocument(AppUser user, String claimId, String docId) {
        Claim c = claims.findById(claimId).filter(x -> x.getUserId().equals(user.getId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that claim."));
        if (!OPEN.contains(c.getStatus())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Documents can't be changed on this claim any more.");
        ClaimDocument d = documents.findById(docId).filter(x -> x.getClaimId().equals(claimId)).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that document."));
        store.delete(d.getStorageKey());
        documents.delete(d);
    }

    public record Download(String contentType, String fileName, byte[] bytes) {}

    @Transactional(readOnly = true)
    public Download download(AppUser user, String claimId, String docId) {
        claims.findById(claimId).filter(x -> x.getUserId().equals(user.getId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that claim."));
        return load(claimId, docId);
    }

    @Transactional
    public Download adminDownload(StaffUser staff, String claimId, String docId) {
        Download d = load(claimId, docId);
        audit.record(staff.getEmail(), "claim.document.viewed", "claim", claimId, "document " + docId.substring(0, 8));
        return d;
    }

    private Download load(String claimId, String docId) {
        ClaimDocument d = documents.findById(docId).filter(x -> x.getClaimId().equals(claimId)).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that document."));
        return new Download(d.getContentType(), d.getFileName(), store.load(d.getStorageKey()));
    }

    private static ClaimDocumentDto toDto(ClaimDocument d) {
        return new ClaimDocumentDto(d.getId(), d.getDocType(), d.getFileName(), d.getContentType(), d.getSizeBytes(), iso(d.getCreatedAt()));
    }

    /** PDF, JPEG or PNG by magic bytes; anything else is refused. */
    static String detect(byte[] b) {
        if (b.length > 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return "application/pdf";
        if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (b.length > 7 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G' && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "image/png";
        return null;
    }

    static String cleanName(String original, String contentType) {
        String base = original == null ? "" : original.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[^A-Za-z0-9._ -]", "_").trim();
        if (base.isEmpty()) base = "document";
        if (base.length() > 80) base = base.substring(base.length() - 80);
        String ext = switch (contentType) { case "application/pdf" -> ".pdf"; case "image/png" -> ".png"; default -> ".jpg"; };
        return base.toLowerCase().endsWith(ext) || (ext.equals(".jpg") && base.toLowerCase().endsWith(".jpeg")) ? base : base + ext;
    }
}
