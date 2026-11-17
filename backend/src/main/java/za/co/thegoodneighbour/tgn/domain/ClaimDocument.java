package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Metadata for an uploaded claim document. The file itself is stored encrypted on disk under storageKey. */
@Entity
@Table(name = "claim_documents", indexes = @Index(columnList = "claimId"))
public class ClaimDocument {
    public static final java.util.List<String> TYPES = java.util.List.of("death_certificate", "deceased_id", "claimant_id", "other");

    @Id private String id = UUID.randomUUID().toString();
    private String claimId;
    private String docType;
    private String fileName;
    private String contentType;
    private long sizeBytes;
    private String storageKey;
    private Instant createdAt = Instant.now();

    protected ClaimDocument() {}

    public ClaimDocument(String claimId, String docType, String fileName, String contentType, long sizeBytes, String storageKey) {
        this.claimId = claimId; this.docType = docType; this.fileName = fileName; this.contentType = contentType;
        this.sizeBytes = sizeBytes; this.storageKey = storageKey;
    }

    public String getId() { return id; }
    public String getClaimId() { return claimId; }
    public String getDocType() { return docType; }
    public String getFileName() { return fileName; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public String getStorageKey() { return storageKey; }
    public Instant getCreatedAt() { return createdAt; }
}
