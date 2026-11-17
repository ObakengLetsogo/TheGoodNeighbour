package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.UUID;
import za.co.thegoodneighbour.tgn.config.PiiCrypto;

@Entity
@Table(name = "policy_members")
public class PolicyMember {
    @Id private String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "policy_id") private Policy policy;
    private String type;
    private String fullName;
    @Convert(converter = PiiCrypto.class) private String idNumber;
    private String dateOfBirth;
    private long feeCents;
    private long coverCents;
    /** "active" or "removed". Removed members are kept for the audit trail but are no longer billed. */
    private String status = "active";
    private String addedOn;
    private String coverStartsOn;

    protected PolicyMember() {}

    public PolicyMember(String type, String fullName, String idNumber, String dateOfBirth, long feeCents, long coverCents,
                        String addedOn, String coverStartsOn) {
        this.type = type; this.fullName = fullName; this.idNumber = idNumber; this.dateOfBirth = dateOfBirth;
        this.feeCents = feeCents; this.coverCents = coverCents; this.addedOn = addedOn; this.coverStartsOn = coverStartsOn;
    }

    void setPolicy(Policy p) { this.policy = p; }
    public void remove() { this.status = "removed"; }
    public void setCoverStartsOn(String d) { this.coverStartsOn = d; }

    public String getId() { return id; }
    public String getType() { return type; }
    public String getFullName() { return fullName; }
    public String getIdNumber() { return idNumber; }
    public String getDateOfBirth() { return dateOfBirth; }
    public long getFeeCents() { return feeCents; }
    public long getCoverCents() { return coverCents; }
    public String getStatus() { return status; }
    public String getAddedOn() { return addedOn; }
    public String getCoverStartsOn() { return coverStartsOn; }
}
