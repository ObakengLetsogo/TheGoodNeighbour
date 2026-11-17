package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** Terms and privacy text, edited by staff. The version goes up whenever the text changes, and customers' acceptance is recorded against it. */
@Entity
@Table(name = "legal_documents")
public class LegalDocument {
    @Id private String slug;
    private String title;
    @Column(columnDefinition = "text") private String body;
    private int version = 1;
    /** True while the text is placeholder wording that has not been approved. Shown to customers as a draft. */
    private boolean draft = true;
    private Instant updatedAt = Instant.now();

    protected LegalDocument() {}

    public LegalDocument(String slug, String title, String body, boolean draft) {
        this.slug = slug; this.title = title; this.body = body; this.draft = draft;
    }

    public void update(String title, String body, boolean draft) {
        if (!this.body.equals(body)) this.version++;
        this.title = title; this.body = body; this.draft = draft; this.updatedAt = Instant.now();
    }

    public String getSlug() { return slug; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public int getVersion() { return version; }
    public boolean isDraft() { return draft; }
    public Instant getUpdatedAt() { return updatedAt; }
}
