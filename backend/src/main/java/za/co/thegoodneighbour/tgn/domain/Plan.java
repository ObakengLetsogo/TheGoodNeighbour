package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * A funeral plan. All commercial rules (premium, family member fees, cover, age limits, waiting
 * period) are data, so staff can change them without a release and the underwriter's rules can be
 * loaded once they are known. Money is integer cents (ZAR).
 */
@Entity
@Table(name = "plans")
public class Plan {
    public static final List<String> MEMBER_TYPES = List.of("spouse", "child", "parent", "extended");

    @Embeddable
    public record MemberRule(String type, long feeCents, long coverCents, int maxCount, int minAge, int maxAge) {}

    @Id private String id;
    private String name;
    @Column(length = 1000) private String description;
    private long coverCents;
    private long premiumCents;
    private int waitingPeriodDays;
    private int minAge;
    private int maxAge;
    private String accent;
    private boolean active = true;
    private int sortOrder;

    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "plan_member_rules", joinColumns = @JoinColumn(name = "plan_id"))
    private List<MemberRule> memberRules = new ArrayList<>();

    protected Plan() {}

    public Plan(String id, String name, String description, long coverCents, long premiumCents, int waitingPeriodDays,
                int minAge, int maxAge, String accent, boolean active, int sortOrder, List<MemberRule> rules) {
        this.id = id; this.name = name; this.description = description; this.coverCents = coverCents;
        this.premiumCents = premiumCents; this.waitingPeriodDays = waitingPeriodDays; this.minAge = minAge;
        this.maxAge = maxAge; this.accent = accent; this.active = active; this.sortOrder = sortOrder;
        this.memberRules = new ArrayList<>(rules);
    }

    public Optional<MemberRule> rule(String type) {
        return memberRules.stream().filter(r -> r.type().equals(type)).findFirst();
    }

    public void update(String name, String description, long coverCents, long premiumCents, int waitingPeriodDays,
                       int minAge, int maxAge, boolean active, List<MemberRule> rules) {
        this.name = name; this.description = description; this.coverCents = coverCents; this.premiumCents = premiumCents;
        this.waitingPeriodDays = waitingPeriodDays; this.minAge = minAge; this.maxAge = maxAge; this.active = active;
        this.memberRules.clear();
        this.memberRules.addAll(rules);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public long getCoverCents() { return coverCents; }
    public long getPremiumCents() { return premiumCents; }
    public int getWaitingPeriodDays() { return waitingPeriodDays; }
    public int getMinAge() { return minAge; }
    public int getMaxAge() { return maxAge; }
    public String getAccent() { return accent; }
    public boolean isActive() { return active; }
    public int getSortOrder() { return sortOrder; }
    public List<MemberRule> getMemberRules() { return memberRules; }
}
