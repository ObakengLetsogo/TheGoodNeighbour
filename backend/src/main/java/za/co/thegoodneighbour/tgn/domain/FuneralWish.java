package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * What one covered person would like for their funeral: burial or cremation, where, the church, the music, and who to call first.
 * Recorded by the plan's owner (often with the person). member_key is "main" for the plan's main member, otherwise the member's id.
 */
@Entity
@Table(name = "funeral_wishes")
public class FuneralWish {
    @Id private String id = UUID.randomUUID().toString();
    private String policyId;
    private String memberKey;
    private String disposition;      // burial | cremation | family_decides
    private String place;
    private String denomination;
    @Column(length = 1000) private String music;
    @Column(length = 2000) private String notes;
    private String contactName;
    private String contactPhone;
    private Instant updatedAt = Instant.now();
    private String updatedBy;

    protected FuneralWish() {}
    public FuneralWish(String policyId, String memberKey) { this.policyId = policyId; this.memberKey = memberKey; }

    public void update(String disposition, String place, String denomination, String music, String notes, String contactName, String contactPhone, String by) {
        this.disposition = disposition; this.place = place; this.denomination = denomination; this.music = music; this.notes = notes;
        this.contactName = contactName; this.contactPhone = contactPhone; this.updatedBy = by; this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public String getPolicyId() { return policyId; }
    public String getMemberKey() { return memberKey; }
    public String getDisposition() { return disposition; }
    public String getPlace() { return place; }
    public String getDenomination() { return denomination; }
    public String getMusic() { return music; }
    public String getNotes() { return notes; }
    public String getContactName() { return contactName; }
    public String getContactPhone() { return contactPhone; }
    public Instant getUpdatedAt() { return updatedAt; }
}
