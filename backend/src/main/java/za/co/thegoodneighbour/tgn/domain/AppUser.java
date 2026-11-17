package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class AppUser {
    @Id private String id = UUID.randomUUID().toString();
    private String fullName;
    @Column(unique = true, nullable = false) private String phone;
    private String email;
    @Column(nullable = false) private String passwordHash;
    private Instant createdAt = Instant.now();

    protected AppUser() {}

    public AppUser(String fullName, String phone, String email, String passwordHash) {
        this.fullName = fullName; this.phone = phone; this.email = email; this.passwordHash = passwordHash;
    }

    public String getId() { return id; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public void updateProfile(String fullName, String email) { this.fullName = fullName; this.email = email; }
}
