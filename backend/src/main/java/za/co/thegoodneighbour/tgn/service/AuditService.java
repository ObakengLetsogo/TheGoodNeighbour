package za.co.thegoodneighbour.tgn.service;

import org.springframework.stereotype.Service;
import za.co.thegoodneighbour.tgn.domain.AuditEvent;
import za.co.thegoodneighbour.tgn.repo.AuditEventRepository;

@Service
public class AuditService {
    private final AuditEventRepository events;
    public AuditService(AuditEventRepository events) { this.events = events; }

    public void record(String actor, String action, String entityType, String entityId, String detail) {
        events.save(new AuditEvent(actor, action, entityType, entityId, detail));
    }
}
