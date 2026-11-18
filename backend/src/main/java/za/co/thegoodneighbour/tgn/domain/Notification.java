package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** A message in a customer's in-app inbox: what changed on their cover or claim, in plain words. */
@Entity
@Table(name = "notifications", indexes = @Index(columnList = "userId, createdAt"))
public class Notification {
    @Id private String id = UUID.randomUUID().toString();
    private String userId;
    private String category;           // cover | payment | claim
    private String title;
    @Column(length = 1000) private String body;
    private String refType;            // policy | claim, so the app can open the right screen
    private String refId;
    private Instant readAt;
    private Instant createdAt = Instant.now();

    protected Notification() {}

    public Notification(String userId, String category, String title, String body, String refType, String refId) {
        this.userId = userId; this.category = category; this.title = title; this.body = body; this.refType = refType; this.refId = refId;
    }

    public void markRead() { if (readAt == null) readAt = Instant.now(); }
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getCategory() { return category; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getRefType() { return refType; }
    public String getRefId() { return refId; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
}
