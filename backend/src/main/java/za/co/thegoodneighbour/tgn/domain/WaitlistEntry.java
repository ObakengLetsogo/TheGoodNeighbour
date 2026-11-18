package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Someone who asked to hear when cover opens. Contact details only: no ID numbers or payment details. */
@Entity
@Table(name = "waitlist_entries")
public class WaitlistEntry {
    @Id private String id = UUID.randomUUID().toString();
    private String firstName;
    private String phone;       // E.164, optional
    private String email;       // lower-case, optional
    private String province;    // optional
    private Instant consentAt = Instant.now();
    private Instant createdAt = Instant.now();

    protected WaitlistEntry() {}

    public WaitlistEntry(String firstName, String phone, String email, String province) {
        this.firstName = firstName; this.phone = phone; this.email = email; this.province = province;
    }

    public String getId() { return id; }
    public String getFirstName() { return firstName; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getProvince() { return province; }
    public Instant getConsentAt() { return consentAt; }
    public Instant getCreatedAt() { return createdAt; }
}
