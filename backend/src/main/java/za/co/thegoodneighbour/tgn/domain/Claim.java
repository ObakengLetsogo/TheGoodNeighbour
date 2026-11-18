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
    /** When staff plan to deliver (yyyy-mm-dd), a window such as "morning", and a note the family can read. */
    private String deliveryDate;
    private String deliveryWindow;
    @Column(length = 1000) private String deliveryNote;
    private Instant deliveredAt;
    /** bundle (the in-kind benefit, the default) or cash. The family can choose until the claim is decided and settled. */
    private String benefitChoice = "bundle";
    /** Frozen when the claim is made: what the cash alternative pays, and what the bundle costs us. */
    private long cashAlternativeCents;
    private long ourCostCents;
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

    public void setStatus(String status, String note) {
        this.status = status; if (note != null) this.staffNote = note; this.updatedAt = Instant.now();
        if ("delivered".equals(status)) this.deliveredAt = this.updatedAt;
    }
    public void setCosts(long ourCostCents, long cashAlternativeCents) { this.ourCostCents = ourCostCents; this.cashAlternativeCents = cashAlternativeCents; }
    public void setBenefitChoice(String c) { this.benefitChoice = c; this.updatedAt = Instant.now(); }
    public void schedule(String date, String window, String note) { this.deliveryDate = date; this.deliveryWindow = window; this.deliveryNote = note; this.updatedAt = Instant.now(); }


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
    public String getBenefitChoice() { return benefitChoice; }
    public long getCashAlternativeCents() { return cashAlternativeCents; }
    public long getOurCostCents() { return ourCostCents; }
    public String getDeliveryDate() { return deliveryDate; }
    public String getDeliveryWindow() { return deliveryWindow; }
    public String getDeliveryNote() { return deliveryNote; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
