package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "claims")
public class Claim {
    @jakarta.persistence.Embeddable
    public record Delivery(String recipientName, String recipientPhone, String addressLine, String suburb, String city,
                           String province, String postalCode, @Column(length = 1000) String instructions) {}

    @Id private String id = UUID.randomUUID().toString();
    @Column(unique = true) private String reference;
    private String policyId;
    private String userId;
    /** Null when the claim is for the main member. */
    private String memberId;
    private String deceasedName;
    private String dateOfDeath;
    private String claimantName;
    private String claimantPhone;
    private String status = "submitted"; // submitted | under_review | approved | declined | delivered
    private String causeOfDeath; // natural | accidental
    private boolean withinWaitingPeriod;
    private boolean overAgeLimit;
    /** Whether the deceased was old enough (16+) that a copy of their ID is required. */
    private boolean deceasedIdRequired;
    /** The bundle the family is owed, frozen when the claim is made (JSON). */
    @Column(columnDefinition = "text") private String bundleJson;
    @Embedded private Delivery delivery;
    @Column(length = 2000) private String staffNote;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    protected Claim() {}

    public Claim(String policyId, String userId, String memberId, String deceasedName, String dateOfDeath, String causeOfDeath,
                 String claimantName, String claimantPhone, boolean withinWaitingPeriod, boolean overAgeLimit, boolean deceasedIdRequired, String bundleJson, Delivery delivery) {
        this.policyId = policyId; this.userId = userId; this.memberId = memberId; this.deceasedName = deceasedName;
        this.dateOfDeath = dateOfDeath; this.causeOfDeath = causeOfDeath; this.claimantName = claimantName; this.claimantPhone = claimantPhone;
        this.withinWaitingPeriod = withinWaitingPeriod; this.overAgeLimit = overAgeLimit; this.deceasedIdRequired = deceasedIdRequired; this.bundleJson = bundleJson; this.delivery = delivery;
        this.reference = "TGN-C-" + id.substring(0, 6).toUpperCase();
    }

    public void setStatus(String status, String note) { this.status = status; if (note != null) this.staffNote = note; this.updatedAt = Instant.now(); }

    public String getId() { return id; }
    public String getReference() { return reference; }
    public String getPolicyId() { return policyId; }
    public String getUserId() { return userId; }
    public String getMemberId() { return memberId; }
    public String getDeceasedName() { return deceasedName; }
    public String getDateOfDeath() { return dateOfDeath; }
    public String getClaimantName() { return claimantName; }
    public String getClaimantPhone() { return claimantPhone; }
    public String getStatus() { return status; }
    public String getCauseOfDeath() { return causeOfDeath; }
    public boolean isWithinWaitingPeriod() { return withinWaitingPeriod; }
    public boolean isOverAgeLimit() { return overAgeLimit; }
    public boolean isDeceasedIdRequired() { return deceasedIdRequired; }
    public String getBundleJson() { return bundleJson; }
    public Delivery getDelivery() { return delivery; }
    public String getStaffNote() { return staffNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
