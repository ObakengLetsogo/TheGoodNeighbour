package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Append-only record of staff actions on policies, payments, claims and plans. */
@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id private String id = UUID.randomUUID().toString();
    private Instant at = Instant.now();
    private String actor;
    private String action;
    private String entityType;
    private String entityId;
    @Column(length = 2000) private String detail;

    protected AuditEvent() {}

    public AuditEvent(String actor, String action, String entityType, String entityId, String detail) {
        this.actor = actor; this.action = action; this.entityType = entityType; this.entityId = entityId; this.detail = detail;
    }

    public String getId() { return id; }
    public Instant getAt() { return at; }
    public String getActor() { return actor; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public String getEntityId() { return entityId; }
    public String getDetail() { return detail; }
}
