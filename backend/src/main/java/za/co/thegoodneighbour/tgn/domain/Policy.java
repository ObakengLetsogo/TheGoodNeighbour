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
    /** False when the owner only pays: they are not a covered person and are not priced or claimable. */
    private boolean coverMainMember = true;
    /** Set when the covered main member dies. Cover for the others continues until continuationUntil while someone takes over. */
    private String holderDiedOn;
    private String continuationUntil;
    /** JSON list of bundle versions (what the family is owed). The last is current; earlier ones can still apply during an upgrade's waiting period. */
    @Column(columnDefinition = "text") private String bundleVersionsJson;
    /** The reference monthly price: the bundle's cost times the base rate, before anyone's relationship or age is applied. */
    private long baseMonthlyCents;
    private int mainAgeBps = 10000;
    private long mainFeeCents;
    private long monthlyTotalCents;
    /** DebiCheck mandate state. Written only from the payment provider's confirmation. */
    private String mandateStatus = "not_set_up";
    private Instant createdAt = Instant.now();
    private Instant reviewedAt;
    /** Which versions of the terms and privacy notice the customer accepted, and when. */
    private Integer termsVersion;
    private Integer privacyVersion;
    private Instant consentAt;
    private String lapsedAt;
    private String cancelledAt;
    private Instant cancelRequestedAt;
    private Instant reinstateRequestedAt;
    private String startDate;
    private String waitingEndsOn;

    @OneToMany(mappedBy = "policy", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position, id")
    private List<PolicyMember> members = new ArrayList<>();

    protected Policy() {}

    public Policy(String userId, String holderName, String holderIdNumber, String holderDob, int debitDay) {
        this.userId = userId; this.holderName = holderName; this.holderIdNumber = holderIdNumber;
        this.holderDob = holderDob; this.debitDay = debitDay;
        this.reference = "TGN-P-" + id.substring(0, 6).toUpperCase();
    }

    public void recordConsent(int terms, int privacy) { this.termsVersion = terms; this.privacyVersion = privacy; this.consentAt = Instant.now(); }
    public Integer getTermsVersion() { return termsVersion; }
    public Integer getPrivacyVersion() { return privacyVersion; }
    public Instant getConsentAt() { return consentAt; }

    public void addMember(PolicyMember m) { m.setPosition(members.size()); members.add(m); m.setPolicy(this); }
    public List<PolicyMember> activeMembers() { return members.stream().filter(m -> "active".equals(m.getStatus())).toList(); }

    public void setStatus(String s) { this.status = s; this.reviewedAt = Instant.now(); }
    public void activate(LocalDate today, LocalDate waitingEnds) {
        this.status = "active";
        this.lapsedAt = null;
        this.reinstateRequestedAt = null;
        if (startDate == null) { startDate = today.toString(); waitingEndsOn = waitingEnds.toString(); }
    }
    public void markLapsed(LocalDate d) { this.lapsedAt = d.toString(); }
    public void markCancelled(LocalDate d) { this.cancelledAt = d.toString(); this.cancelRequestedAt = null; this.reinstateRequestedAt = null; }
    public void requestCancel() { if (cancelRequestedAt == null) cancelRequestedAt = Instant.now(); }
    public void withdrawCancelRequest() { this.cancelRequestedAt = null; }
    public void requestReinstate() { this.reinstateRequestedAt = Instant.now(); }
    public String getLapsedAt() { return lapsedAt; }
    public String getCancelledAt() { return cancelledAt; }
    public Instant getCancelRequestedAt() { return cancelRequestedAt; }
    public Instant getReinstateRequestedAt() { return reinstateRequestedAt; }

    public void setMonthlyTotalCents(long v) { this.monthlyTotalCents = v; }
    public void setMainPricing(int ageBps, long feeCents) { this.mainAgeBps = ageBps; this.mainFeeCents = feeCents; }
    public int getMainAgeBps() { return mainAgeBps; }
    public long getMainFeeCents() { return mainFeeCents; }
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
    public boolean isCoverMainMember() { return coverMainMember; }
    /** Whether the owner is a covered, priced person right now: they chose to be covered and are still living. */
    public boolean coversHolder() { return coverMainMember && holderDiedOn == null; }
    public String getHolderDiedOn() { return holderDiedOn; }
    public String getContinuationUntil() { return continuationUntil; }
    public void markHolderDied(String date) { this.holderDiedOn = date; }
    public void setContinuationUntil(String d) { this.continuationUntil = d; }
    /** A new person takes over the plan: new account, new holder details, and no longer a deceased main member. */
    public void handOver(String userId, String name, String idNumber, String dob, boolean covered) {
        this.userId = userId; this.holderName = name; this.holderIdNumber = idNumber; this.holderDob = dob;
        this.coverMainMember = covered; this.holderDiedOn = null; this.continuationUntil = null;
    }
    public void setCoverMainMember(boolean v) { this.coverMainMember = v; }
    public long getMonthlyTotalCents() { return monthlyTotalCents; }
    public String getMandateStatus() { return mandateStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public String getStartDate() { return startDate; }
    public String getWaitingEndsOn() { return waitingEndsOn; }
    public List<PolicyMember> getMembers() { return members; }
}
