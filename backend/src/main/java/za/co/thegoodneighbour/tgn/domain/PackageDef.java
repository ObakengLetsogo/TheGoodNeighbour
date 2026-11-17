package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "packages")
public class PackageDef {
    @Embeddable public record Line(String productId, String variantId, int quantity, boolean optional) {}

    @Id private String id;
    private String name;
    @Column(length = 1000) private String description;
    private String accommodates;
    private String accent;
    /** Bundle saving in basis points (500 = 5%). */
    private int discountBps;
    private String imageUrl;
    private int sortOrder;

    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "package_occasions", joinColumns = @JoinColumn(name = "package_id"))
    @Column(name = "occasion") private List<String> occasions = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "package_lines", joinColumns = @JoinColumn(name = "package_id"))
    @OrderColumn(name = "position") private List<Line> lines = new ArrayList<>();

    protected PackageDef() {}

    public PackageDef(String id, String name, String description, String accommodates, String accent, int discountBps,
                      String imageUrl, int sortOrder, List<String> occasions, List<Line> lines) {
        this.id = id; this.name = name; this.description = description; this.accommodates = accommodates;
        this.accent = accent; this.discountBps = discountBps; this.imageUrl = imageUrl; this.sortOrder = sortOrder;
        if (occasions != null) this.occasions = new ArrayList<>(occasions);
        if (lines != null) this.lines = new ArrayList<>(lines);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getAccommodates() { return accommodates; }
    public String getAccent() { return accent; }
    public int getDiscountBps() { return discountBps; }
    public String getImageUrl() { return imageUrl; }
    public int getSortOrder() { return sortOrder; }
    public List<String> getOccasions() { return occasions; }
    public List<Line> getLines() { return lines; }
}
