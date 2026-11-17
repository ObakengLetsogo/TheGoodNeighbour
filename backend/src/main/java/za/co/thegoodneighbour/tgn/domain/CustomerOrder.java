package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * An order is an immutable snapshot of what was bought and at what price. Lines and packages are
 * stored as JSON so later catalogue edits never rewrite history. Status and payment status are
 * changed only by operations/payment providers, never by the customer app.
 */
@Entity
@Table(name = "orders")
public class CustomerOrder {
    @Embeddable
    public record Delivery(String recipientName, String recipientPhone, String addressLine, String suburb, String city,
                           String provinceCode, String province, String postalCode,
                           @Column(name = "delivery_date") String date, @Column(name = "delivery_window") String window,
                           @Column(length = 1000) String instructions) {}

    @Id private String id = UUID.randomUUID().toString();
    @Column(unique = true) private String reference;
    private String userId;
    private Instant createdAt = Instant.now();
    private String status = "order_received";
    private String paymentStatus = "awaiting_payment";
    @Column(columnDefinition = "text") private String linesJson;
    @Column(columnDefinition = "text") private String packagesJson;
    private long itemsCents;
    private long packageSavingCents;
    private long subtotalCents;
    private long deliveryCents;
    private long totalCents;
    @Column(length = 1000) private String notes;
    private String placedByName;
    private String placedByPhone;
    @Embedded private Delivery delivery;

    protected CustomerOrder() {}

    public CustomerOrder(String userId, String placedByName, String placedByPhone, String linesJson, String packagesJson,
                         long itemsCents, long packageSavingCents, long subtotalCents, long deliveryCents,
                         long totalCents, String notes, Delivery delivery) {
        this.userId = userId; this.placedByName = placedByName; this.placedByPhone = placedByPhone;
        this.linesJson = linesJson; this.packagesJson = packagesJson; this.itemsCents = itemsCents;
        this.packageSavingCents = packageSavingCents; this.subtotalCents = subtotalCents; this.deliveryCents = deliveryCents;
        this.totalCents = totalCents; this.notes = notes; this.delivery = delivery;
        this.reference = "TGN-" + id.substring(0, 6).toUpperCase();
    }

    public String getId() { return id; }
    public String getReference() { return reference; }
    public String getUserId() { return userId; }
    public Instant getCreatedAt() { return createdAt; }
    public String getStatus() { return status; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getLinesJson() { return linesJson; }
    public String getPackagesJson() { return packagesJson; }
    public long getItemsCents() { return itemsCents; }
    public long getPackageSavingCents() { return packageSavingCents; }
    public long getSubtotalCents() { return subtotalCents; }
    public long getDeliveryCents() { return deliveryCents; }
    public long getTotalCents() { return totalCents; }
    public String getNotes() { return notes; }
    public String getPlacedByName() { return placedByName; }
    public String getPlacedByPhone() { return placedByPhone; }
    public Delivery getDelivery() { return delivery; }
}
