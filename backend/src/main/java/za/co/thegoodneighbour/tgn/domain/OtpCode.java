package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** A one-time code sent by SMS. Only a salted hash is stored; codes expire and allow a few attempts. */
@Entity
@Table(name = "otp_codes", indexes = @Index(columnList = "phone, purpose"))
public class OtpCode {
    @Id private String id = UUID.randomUUID().toString();
    private String phone;
    private String purpose; // verify_phone | reset_password | change_phone
    private String salt;
    private String codeHash;
    private int attempts;
    private Instant expiresAt;
    private Instant usedAt;
    private Instant createdAt = Instant.now();

    protected OtpCode() {}

    public OtpCode(String phone, String purpose, String salt, String codeHash, Instant expiresAt) {
        this.phone = phone; this.purpose = purpose; this.salt = salt; this.codeHash = codeHash; this.expiresAt = expiresAt;
    }

    public void recordAttempt() { attempts++; }
    public void markUsed(Instant now) { usedAt = now; }

    public String getPhone() { return phone; }
    public String getPurpose() { return purpose; }
    public String getSalt() { return salt; }
    public String getCodeHash() { return codeHash; }
    public int getAttempts() { return attempts; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
