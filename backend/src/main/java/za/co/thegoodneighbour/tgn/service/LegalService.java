package za.co.thegoodneighbour.tgn.service;

import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.LegalDocument;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.repo.LegalDocumentRepository;

@Service
public class LegalService {
    private final LegalDocumentRepository docs;
    private final AuditService audit;

    public LegalService(LegalDocumentRepository docs, AuditService audit) { this.docs = docs; this.audit = audit; }

    @Transactional(readOnly = true)
    public List<LegalSummaryDto> list() {
        return docs.findAll().stream().sorted(java.util.Comparator.comparing(LegalDocument::getSlug).reversed())
                .map(d -> new LegalSummaryDto(d.getSlug(), d.getTitle(), d.getVersion(), d.isDraft())).toList();
    }

    @Transactional(readOnly = true)
    public LegalDocDto get(String slug) {
        return docs.findById(slug).map(LegalService::toDto).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that document."));
    }

    @Transactional(readOnly = true)
    public int version(String slug) { return docs.findById(slug).map(LegalDocument::getVersion).orElse(0); }

    @Transactional
    public LegalDocDto update(StaffUser staff, String slug, LegalUpdate u) {
        LegalDocument d = docs.findById(slug).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that document."));
        int before = d.getVersion();
        d.update(u.title().trim(), u.body(), u.draft());
        audit.record(staff.getEmail(), "legal.updated", "legal_document", slug, "version " + before + " -> " + d.getVersion() + ", draft=" + u.draft());
        return toDto(docs.save(d));
    }

    static LegalDocDto toDto(LegalDocument d) {
        return new LegalDocDto(d.getSlug(), d.getTitle(), d.getBody(), d.getVersion(), d.isDraft(), DateTimeFormatter.ISO_INSTANT.format(d.getUpdatedAt().atOffset(ZoneOffset.UTC)));
    }
}
