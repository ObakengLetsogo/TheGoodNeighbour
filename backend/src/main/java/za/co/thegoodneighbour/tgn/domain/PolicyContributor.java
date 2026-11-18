package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Someone who shares the monthly cost of another person's cover, for example a sibling paying towards their parents' plan.
 * Invited by phone number. Becomes active only when that person accepts with a verified number. The share is a percentage
 * (in basis points) of the monthly price; the owner pays whatever is left.
 */
@Entity
@Table(name = "policy_contributors")
public class PolicyContributor {
    public static final String INVITED = "invited", ACTIVE = "active", DECLINED = "declined", LEFT = "left", REMOVED = "removed";

    @Id private String id = UUID.randomUUID().toString();
    private String policyId;
    private String userId;      // set when the invitation is accepted
    private String phone;
    private String name;        // what the owner calls them
    private String status = INVITED;
    private int shareBps;
    private Instant invitedAt = Instant.now();
    private Instant respondedAt;

    protected PolicyContributor() {}

    public PolicyContributor(String policyId, String phone, String name, int shareBps) {
        this.policyId = policyId; this.phone = phone; this.name = name; this.shareBps = shareBps;
    }

    public void accept(String userId) { this.userId = userId; this.status = ACTIVE; this.respondedAt = Instant.now(); }
    public void decline() { this.status = DECLINED; this.respondedAt = Instant.now(); }
    public void leave() { this.status = LEFT; this.respondedAt = Instant.now(); }
    public void remove() { this.status = REMOVED; this.respondedAt = Instant.now(); }
    public void setShareBps(int bps) { this.shareBps = bps; }

    public String getId() { return id; }
    public String getPolicyId() { return policyId; }
    public String getUserId() { return userId; }
    public String getPhone() { return phone; }
    public String getName() { return name; }
    public String getStatus() { return status; }
    public int getShareBps() { return shareBps; }
    public Instant getInvitedAt() { return invitedAt; }
}
