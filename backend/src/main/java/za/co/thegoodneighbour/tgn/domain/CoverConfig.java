package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The commercial rules of the cover, as data. Staff change them in the admin dashboard, and the
 * underwriter's real numbers replace the placeholder defaults. Money is integer cents (ZAR).
 */
@Entity
@Table(name = "cover_config")
public class CoverConfig {
    public static final String ID = "default";
    public static final List<String> RELATIONSHIPS = List.of("spouse", "child", "parent", "parent_in_law", "grandparent", "sibling", "other");

    /** Per-relationship pricing and eligibility. The monthly fee is the main member's premium times multiplierBps. */
    @Embeddable
    public record RelationshipRule(String relationship, int multiplierBps, int minAge, int maxAge, int coverEndAge, int maxCount) {}

    @Id private String id = ID;
    /** Monthly premium for the main member, in basis points of the bundle's cost to the company. */
    private int baseRateBps;
    private long minBundleValueCents;
    private int naturalWaitingDays;
    private int accidentalWaitingDays;
    private int upgradeWaitingDays;
    private int mainMinAge;
    private int mainMaxAge;
    private int mainCoverEndAge;
    private int maxMembers;
    /** How many times the herd size we may promise in livestock across all policies. */
    private int maxCommitmentMultiple;
    private int lapseAfterMissedPayments;
    private int reinstateWithinDays;
    private int escalationCapBps;

    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "cover_relationship_rules", joinColumns = @JoinColumn(name = "config_id"))
    private List<RelationshipRule> rules = new ArrayList<>();

    protected CoverConfig() {}

    public CoverConfig(int baseRateBps, long minBundleValueCents, int naturalWaitingDays, int accidentalWaitingDays, int upgradeWaitingDays,
                       int mainMinAge, int mainMaxAge, int mainCoverEndAge, int maxMembers, int maxCommitmentMultiple,
                       int lapseAfterMissedPayments, int reinstateWithinDays, int escalationCapBps, List<RelationshipRule> rules) {
        apply(baseRateBps, minBundleValueCents, naturalWaitingDays, accidentalWaitingDays, upgradeWaitingDays, mainMinAge, mainMaxAge,
                mainCoverEndAge, maxMembers, maxCommitmentMultiple, lapseAfterMissedPayments, reinstateWithinDays, escalationCapBps, rules);
    }

    public final void apply(int baseRateBps, long minBundleValueCents, int naturalWaitingDays, int accidentalWaitingDays, int upgradeWaitingDays,
                            int mainMinAge, int mainMaxAge, int mainCoverEndAge, int maxMembers, int maxCommitmentMultiple,
                            int lapseAfterMissedPayments, int reinstateWithinDays, int escalationCapBps, List<RelationshipRule> rules) {
        this.baseRateBps = baseRateBps; this.minBundleValueCents = minBundleValueCents; this.naturalWaitingDays = naturalWaitingDays;
        this.accidentalWaitingDays = accidentalWaitingDays; this.upgradeWaitingDays = upgradeWaitingDays; this.mainMinAge = mainMinAge;
        this.mainMaxAge = mainMaxAge; this.mainCoverEndAge = mainCoverEndAge; this.maxMembers = maxMembers;
        this.maxCommitmentMultiple = maxCommitmentMultiple; this.lapseAfterMissedPayments = lapseAfterMissedPayments;
        this.reinstateWithinDays = reinstateWithinDays; this.escalationCapBps = escalationCapBps;
        this.rules.clear();
        this.rules.addAll(rules);
    }

    public Optional<RelationshipRule> rule(String relationship) {
        return rules.stream().filter(r -> r.relationship().equals(relationship)).findFirst();
    }

    public String getId() { return id; }
    public int getBaseRateBps() { return baseRateBps; }
    public long getMinBundleValueCents() { return minBundleValueCents; }
    public int getNaturalWaitingDays() { return naturalWaitingDays; }
    public int getAccidentalWaitingDays() { return accidentalWaitingDays; }
    public int getUpgradeWaitingDays() { return upgradeWaitingDays; }
    public int getMainMinAge() { return mainMinAge; }
    public int getMainMaxAge() { return mainMaxAge; }
    public int getMainCoverEndAge() { return mainCoverEndAge; }
    public int getMaxMembers() { return maxMembers; }
    public int getMaxCommitmentMultiple() { return maxCommitmentMultiple; }
    public int getLapseAfterMissedPayments() { return lapseAfterMissedPayments; }
    public int getReinstateWithinDays() { return reinstateWithinDays; }
    public int getEscalationCapBps() { return escalationCapBps; }
    public List<RelationshipRule> getRules() { return rules; }
}
