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
    private String status = "open"; // open | in_progress | resolved
    @Column(length = 2000) private String staffNote;
    private Instant updatedAt = Instant.now();

    protected SupportRequest() {}

    public SupportRequest(String userId, String kind, String orderRef, String message, String contactPhone) {
        this.userId = userId; this.kind = kind; this.orderRef = orderRef; this.message = message; this.contactPhone = contactPhone;
    }

    public void setStatus(String status, String note) { this.status = status; if (note != null) this.staffNote = note; this.updatedAt = Instant.now(); }
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getKind() { return kind; }
    public String getOrderRef() { return orderRef; }
    public String getMessage() { return message; }
    public String getContactPhone() { return contactPhone; }
    public Instant getCreatedAt() { return createdAt; }
    public String getStatus() { return status; }
    public String getStaffNote() { return staffNote; }
}
