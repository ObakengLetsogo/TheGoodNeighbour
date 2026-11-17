package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Something a customer can include in their bundle: a grocery hamper tier, sheep, cattle.
 * valueCents is what the family receives (shown to customers); costCents is what it costs the company
 * and prices the premium. Cost is internal and never sent to the customer apps.
 */
@Entity
@Table(name = "benefit_items")
public class BenefitItem {
    @Id private String id;
    private String kind; // grocery | livestock
    private String name;
    @Column(length = 1000) private String description;
    private String unitLabel;
    private long valueCents;
    private long costCents;
    private int maxQty;
    /** Items sharing a group are mutually exclusive (e.g. one grocery hamper tier). */
    private String groupId;
    private boolean active = true;
    private int sortOrder;
    /** Animals on the farm backing this item. Null for items that aren't livestock. */
    private Integer onFarm;

    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "benefit_item_contents", joinColumns = @JoinColumn(name = "item_id"))
    @OrderColumn(name = "position") @Column(name = "line", length = 200)
    private List<String> contents = new ArrayList<>();

    protected BenefitItem() {}

    public BenefitItem(String id, String kind, String name, String description, String unitLabel, long valueCents, long costCents,
                       int maxQty, String groupId, boolean active, int sortOrder, Integer onFarm, List<String> contents) {
        this.id = id; this.kind = kind; this.name = name; this.description = description; this.unitLabel = unitLabel;
        this.valueCents = valueCents; this.costCents = costCents; this.maxQty = maxQty; this.groupId = groupId;
        this.active = active; this.sortOrder = sortOrder; this.onFarm = onFarm;
        if (contents != null) this.contents = new ArrayList<>(contents);
    }

    public void update(String name, String description, long valueCents, long costCents, int maxQty, boolean active, Integer onFarm, List<String> contents) {
        this.name = name; this.description = description; this.valueCents = valueCents; this.costCents = costCents;
        this.maxQty = maxQty; this.active = active; this.onFarm = onFarm;
        this.contents.clear();
        this.contents.addAll(contents);
    }

    public String getId() { return id; }
    public String getKind() { return kind; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getUnitLabel() { return unitLabel; }
    public long getValueCents() { return valueCents; }
    public long getCostCents() { return costCents; }
    public int getMaxQty() { return maxQty; }
    public String getGroupId() { return groupId; }
    public boolean isActive() { return active; }
    public int getSortOrder() { return sortOrder; }
    public Integer getOnFarm() { return onFarm; }
    public List<String> getContents() { return contents; }
}
