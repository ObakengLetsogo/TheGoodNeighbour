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
    private boolean phoneVerified;
    private int failedLogins;
    private Instant lockedUntil;
    private boolean notifyClaims = true;
    private boolean notifyPayments = true;
    private boolean notifyNews;

    protected AppUser() {}

    public AppUser(String fullName, String phone, String email, String passwordHash) {
        this.fullName = fullName; this.phone = phone; this.email = email; this.passwordHash = passwordHash;
    }

    public String getId() { return id; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLockedUntil() { return lockedUntil; }
    public boolean isPhoneVerified() { return phoneVerified; }
    public boolean isNotifyClaims() { return notifyClaims; }
    public boolean isNotifyPayments() { return notifyPayments; }
    public boolean isNotifyNews() { return notifyNews; }
    public void updateProfile(String fullName, String email) { this.fullName = fullName; this.email = email; }
    public void setPasswordHash(String hash) { this.passwordHash = hash; }
    /** Changing the number clears verification until the new number is confirmed (the caller marks it verified). */
    public void changePhone(String phone) { this.phone = phone; this.phoneVerified = true; }
    public void markPhoneVerified() { this.phoneVerified = true; }
    public void setNotifications(boolean claims, boolean payments, boolean news) { this.notifyClaims = claims; this.notifyPayments = payments; this.notifyNews = news; }

    public static final int MAX_FAILED_LOGINS = 5;
    public static final long LOCK_MINUTES = 15;
    public boolean isLocked(Instant now) { return lockedUntil != null && lockedUntil.isAfter(now); }
    public void recordFailedLogin(Instant now) {
        failedLogins++;
        if (failedLogins >= MAX_FAILED_LOGINS) { lockedUntil = now.plusSeconds(LOCK_MINUTES * 60); failedLogins = 0; }
    }
    public void clearFailedLogins() { failedLogins = 0; lockedUntil = null; }
}
