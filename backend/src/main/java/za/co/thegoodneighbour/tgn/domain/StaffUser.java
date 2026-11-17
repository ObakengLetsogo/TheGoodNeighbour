package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "staff_users")
public class StaffUser {
    @Id private String id = UUID.randomUUID().toString();
    @Column(unique = true, nullable = false) private String email;
    private String fullName;
    @Column(nullable = false) private String passwordHash;
    private String role = "admin";

    protected StaffUser() {}

    public StaffUser(String email, String fullName, String passwordHash) {
        this.email = email.toLowerCase(); this.fullName = fullName; this.passwordHash = passwordHash;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
}
