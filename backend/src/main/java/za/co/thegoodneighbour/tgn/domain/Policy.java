package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import za.co.thegoodneighbour.tgn.config.PiiCrypto;

/**
 * A customer's funeral plan. Lifecycle: pending_review -> approved -> active (first confirmed
 * premium) -> lapsed/cancelled; or declined. Only staff and payment confirmations move it.
 */
@Entity
@Table(name = "policies")
public class Policy {
    public static final List<String> OPEN_FOR_CHANGES = List.of("pending_review", "approved", "active");

    @Id private String id = UUID.randomUUID().toString();
    @Column(unique = true) private String reference;
    private String userId;
    private String status = "pending_review";
    private String holderName;
    @Convert(converter = PiiCrypto.class) private String holderIdNumber;
    private String holderDob;
    private int debitDay;
    /** JSON list of bundle versions (what the family is owed). The last is current; earlier ones can still apply during an upgrade's waiting period. */
    @Column(columnDefinition = "text") private String bundleVersionsJson;
    private long baseMonthlyCents;
    private long monthlyTotalCents;
    /** DebiCheck mandate state. Written only from the payment provider's confirmation. */
    private String mandateStatus = "not_set_up";
    private Instant createdAt = Instant.now();
    private Instant reviewedAt;
    private String startDate;
    private String waitingEndsOn;

    @OneToMany(mappedBy = "policy", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("addedOn, id")
    private List<PolicyMember> members = new ArrayList<>();

    protected Policy() {}

    public Policy(String userId, String holderName, String holderIdNumber, String holderDob, int debitDay) {
        this.userId = userId; this.holderName = holderName; this.holderIdNumber = holderIdNumber;
        this.holderDob = holderDob; this.debitDay = debitDay;
        this.reference = "TGN-P-" + id.substring(0, 6).toUpperCase();
    }

    public void addMember(PolicyMember m) { members.add(m); m.setPolicy(this); }
    public List<PolicyMember> activeMembers() { return members.stream().filter(m -> "active".equals(m.getStatus())).toList(); }

    public void setStatus(String s) { this.status = s; this.reviewedAt = Instant.now(); }
    public void activate(LocalDate today, LocalDate waitingEnds) {
        this.status = "active";
        if (startDate == null) { startDate = today.toString(); waitingEndsOn = waitingEnds.toString(); }
    }
    public void setMonthlyTotalCents(long v) { this.monthlyTotalCents = v; }
    public void setBundle(String versionsJson, long baseMonthlyCents) { this.bundleVersionsJson = versionsJson; this.baseMonthlyCents = baseMonthlyCents; }

    public String getId() { return id; }
    public String getReference() { return reference; }
    public String getUserId() { return userId; }
    public String getBundleVersionsJson() { return bundleVersionsJson; }
    public long getBaseMonthlyCents() { return baseMonthlyCents; }
    public String getStatus() { return status; }
    public String getHolderName() { return holderName; }
    public String getHolderIdNumber() { return holderIdNumber; }
    public String getHolderDob() { return holderDob; }
    public int getDebitDay() { return debitDay; }
    public long getMonthlyTotalCents() { return monthlyTotalCents; }
    public String getMandateStatus() { return mandateStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public String getStartDate() { return startDate; }
    public String getWaitingEndsOn() { return waitingEndsOn; }
    public List<PolicyMember> getMembers() { return members; }
}
