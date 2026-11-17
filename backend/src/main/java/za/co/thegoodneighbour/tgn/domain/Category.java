package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "categories")
public class Category {
    @Id private String id;
    private String name;
    @Column(name = "category_group") private String group;
    private String accent;
    private String icon;
    private String blurb;
    private int sortOrder;

    protected Category() {}

    public Category(String id, String name, String group, String accent, String icon, String blurb, int sortOrder) {
        this.id = id; this.name = name; this.group = group; this.accent = accent; this.icon = icon;
        this.blurb = blurb; this.sortOrder = sortOrder;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getGroup() { return group; }
    public String getAccent() { return accent; }
    public String getIcon() { return icon; }
    public String getBlurb() { return blurb; }
    public int getSortOrder() { return sortOrder; }
}
