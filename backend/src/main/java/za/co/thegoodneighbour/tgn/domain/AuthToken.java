package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** Opaque bearer token. Only its SHA-256 hash is stored. */
@Entity
@Table(name = "auth_tokens")
public class AuthToken {
    @Id private String tokenHash;
    private String userId;
    private Instant expiresAt;
    /** True for staff (admin dashboard) tokens. Customer and staff tokens are never interchangeable. */
    private boolean staff;

    protected AuthToken() {}

    public AuthToken(String tokenHash, String userId, Instant expiresAt, boolean staff) {
        this.tokenHash = tokenHash; this.userId = userId; this.expiresAt = expiresAt; this.staff = staff;
    }

    public String getUserId() { return userId; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isStaff() { return staff; }
}
