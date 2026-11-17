package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * A sellable product or service. Independent of any occasion type: occasions only tag packages.
 * Price, stock and availability are plain data so an admin dashboard can manage them.
 */
@Entity
@Table(name = "products")
public class Product {
    @Embeddable public record Variant(String id, String label, long priceCents, String availability) {}
    @Embeddable public record ServiceOption(String id, String name, @Column(length = 500) String description, long priceCents) {}

    @Id private String id;
    private String categoryId;
    private String kind;
    private String name;
    @Column(length = 1000) private String description;
    private String unitLabel;
    private long priceCents;
    private String availability;
    private Integer stock;
    private String imageUrl;
    @Column(length = 500) private String deliveryInfo;
    /** Supplier fulfilling this product. Free-form for now; becomes a relation with multi-supplier support. */
    private String supplierId;
    private int sortOrder;

    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "product_variants", joinColumns = @JoinColumn(name = "product_id"))
    private List<Variant> variants = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "product_service_options", joinColumns = @JoinColumn(name = "product_id"))
    private List<ServiceOption> serviceOptions = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "product_includes", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "item") private List<String> includes = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "product_tags", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "tag") private List<String> tags = new ArrayList<>();

    protected Product() {}

    public Product(String id, String categoryId, String kind, String name, String description, String unitLabel,
                   long priceCents, String availability, Integer stock, String imageUrl, String deliveryInfo,
                   String supplierId, int sortOrder, List<Variant> variants, List<ServiceOption> serviceOptions,
                   List<String> includes, List<String> tags) {
        this.id = id; this.categoryId = categoryId; this.kind = kind; this.name = name; this.description = description;
        this.unitLabel = unitLabel; this.priceCents = priceCents; this.availability = availability; this.stock = stock;
        this.imageUrl = imageUrl; this.deliveryInfo = deliveryInfo; this.supplierId = supplierId; this.sortOrder = sortOrder;
        if (variants != null) this.variants = new ArrayList<>(variants);
        if (serviceOptions != null) this.serviceOptions = new ArrayList<>(serviceOptions);
        if (includes != null) this.includes = new ArrayList<>(includes);
        if (tags != null) this.tags = new ArrayList<>(tags);
    }

    public Optional<Variant> variant(String variantId) {
        return variants.stream().filter(v -> v.id().equals(variantId)).findFirst();
    }

    public Optional<ServiceOption> serviceOption(String optionId) {
        return serviceOptions.stream().filter(o -> o.id().equals(optionId)).findFirst();
    }

    public String getId() { return id; }
    public String getCategoryId() { return categoryId; }
    public String getKind() { return kind; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getUnitLabel() { return unitLabel; }
    public long getPriceCents() { return priceCents; }
    public String getAvailability() { return availability; }
    public Integer getStock() { return stock; }
    public String getImageUrl() { return imageUrl; }
    public String getDeliveryInfo() { return deliveryInfo; }
    public String getSupplierId() { return supplierId; }
    public int getSortOrder() { return sortOrder; }
    public List<Variant> getVariants() { return variants; }
    public List<ServiceOption> getServiceOptions() { return serviceOptions; }
    public List<String> getIncludes() { return includes; }
    public List<String> getTags() { return tags; }
}
