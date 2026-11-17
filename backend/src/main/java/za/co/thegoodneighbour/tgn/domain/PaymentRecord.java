package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * A premium payment as it actually happened. Created by the payment provider integration, or by
 * staff recording a payment received outside the provider (source "manual", fully audited).
 */
@Entity
@Table(name = "payment_records")
public class PaymentRecord {
    @Id private String id = UUID.randomUUID().toString();
    private String policyId;
    private long amountCents;
    private String paidOn;
    private String status; // collected | failed | reversed
    private String source; // provider | manual
    private String reference;
    private String recordedBy;
    private Instant createdAt = Instant.now();

    protected PaymentRecord() {}

    public PaymentRecord(String policyId, long amountCents, String paidOn, String status, String source, String reference, String recordedBy) {
        this.policyId = policyId; this.amountCents = amountCents; this.paidOn = paidOn; this.status = status;
        this.source = source; this.reference = reference; this.recordedBy = recordedBy;
    }

    public String getId() { return id; }
    public String getPolicyId() { return policyId; }
    public long getAmountCents() { return amountCents; }
    public String getPaidOn() { return paidOn; }
    public String getStatus() { return status; }
    public String getSource() { return source; }
    public String getReference() { return reference; }
    public Instant getCreatedAt() { return createdAt; }
}
