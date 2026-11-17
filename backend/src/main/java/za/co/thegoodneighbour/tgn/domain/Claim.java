package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "claims")
public class Claim {
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
    private String status = "submitted"; // submitted | under_review | approved | declined | paid
    private boolean withinWaitingPeriod;
    @Column(length = 2000) private String staffNote;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    protected Claim() {}

    public Claim(String policyId, String userId, String memberId, String deceasedName, String dateOfDeath,
                 String claimantName, String claimantPhone, boolean withinWaitingPeriod) {
        this.policyId = policyId; this.userId = userId; this.memberId = memberId; this.deceasedName = deceasedName;
        this.dateOfDeath = dateOfDeath; this.claimantName = claimantName; this.claimantPhone = claimantPhone;
        this.withinWaitingPeriod = withinWaitingPeriod;
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
    public boolean isWithinWaitingPeriod() { return withinWaitingPeriod; }
    public String getStaffNote() { return staffNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
