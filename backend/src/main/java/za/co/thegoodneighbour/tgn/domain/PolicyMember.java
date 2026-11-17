package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.UUID;
import za.co.thegoodneighbour.tgn.config.PiiCrypto;

@Entity
@Table(name = "policy_members")
public class PolicyMember {
    @Id private String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "policy_id") private Policy policy;
    /** Relationship to the main member: spouse, child, parent, parent_in_law, grandparent, sibling, other. */
    private String relationship;
    private String fullName;
    @Convert(converter = PiiCrypto.class) private String idNumber;
    private String dateOfBirth;
    /** The fee is the main member's monthly premium times this multiplier, so it follows bundle changes. */
    private int multiplierBps;
    private int ageBps = 10000;
    private long feeCents;
    /** "active" or "removed". Removed members are kept for the audit trail but are no longer billed. */
    private String status = "active";
    /** The order people were added in, so lists never shuffle. */
    private int position;
    private String addedOn;
    private String coverStartsOn;

    protected PolicyMember() {}

    public PolicyMember(String relationship, String fullName, String idNumber, String dateOfBirth, int multiplierBps, long feeCents,
                        String addedOn, String coverStartsOn) {
        this.relationship = relationship; this.fullName = fullName; this.idNumber = idNumber; this.dateOfBirth = dateOfBirth;
        this.multiplierBps = multiplierBps; this.feeCents = feeCents; this.addedOn = addedOn; this.coverStartsOn = coverStartsOn;
    }

    void setPolicy(Policy p) { this.policy = p; }
    void setPosition(int p) { this.position = p; }
    public void remove() { this.status = "removed"; }
    public void setFullName(String n) { this.fullName = n; }
    public void setIdNumber(String id) { this.idNumber = id; }
    public void setDateOfBirth(String dob) { this.dateOfBirth = dob; }
    public void setRelationship(String r, int multiplierBps) { this.relationship = r; this.multiplierBps = multiplierBps; }
    public void setCoverStartsOn(String d) { this.coverStartsOn = d; }
    public void setPricing(long fee, int ageBps) { this.feeCents = fee; this.ageBps = ageBps; }
    public int getAgeBps() { return ageBps; }

    public String getId() { return id; }
    public String getRelationship() { return relationship; }
    public String getFullName() { return fullName; }
    public String getIdNumber() { return idNumber; }
    public String getDateOfBirth() { return dateOfBirth; }
    public long getFeeCents() { return feeCents; }
    public int getMultiplierBps() { return multiplierBps; }
    public String getStatus() { return status; }
    public String getAddedOn() { return addedOn; }
    public String getCoverStartsOn() { return coverStartsOn; }
}
