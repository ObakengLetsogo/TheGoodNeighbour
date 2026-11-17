package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "support_requests")
public class SupportRequest {
    @Id private String id = UUID.randomUUID().toString();
    private String userId;
    private String kind;
    private String orderRef;
    @Column(length = 4000) private String message;
    private String contactPhone;
    private Instant createdAt = Instant.now();
    private String status = "open";

    protected SupportRequest() {}

    public SupportRequest(String userId, String kind, String orderRef, String message, String contactPhone) {
        this.userId = userId; this.kind = kind; this.orderRef = orderRef; this.message = message; this.contactPhone = contactPhone;
    }
}
