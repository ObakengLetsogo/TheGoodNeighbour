package za.co.thegoodneighbour.tgn.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/**
 * Encrypts personal identifiers (SA ID numbers) at rest with AES-256-GCM. Each value gets its own
 * random IV. Production refuses to start without TGN_PII_KEY; development generates an ephemeral key
 * (data written in a run can't be read after a restart, which is fine for the in-memory database).
 */
@Component
@Converter
public class PiiCrypto implements AttributeConverter<String, String> {
    private static final Logger log = LoggerFactory.getLogger(PiiCrypto.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKeySpec key;

    public PiiCrypto(TgnProperties props, Environment env) {
        byte[] raw;
        if (props.piiKey() == null || props.piiKey().isBlank()) {
            if (env.acceptsProfiles(Profiles.of("prod"))) throw new IllegalStateException("TGN_PII_KEY must be set in production.");
            raw = new byte[32];
            RANDOM.nextBytes(raw);
            log.warn("TGN_PII_KEY not set: using an ephemeral key. Do not use this outside development.");
        } else {
            raw = Base64.getDecoder().decode(props.piiKey());
            if (raw.length != 32) throw new IllegalStateException("TGN_PII_KEY must be 32 bytes, base64 encoded.");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    @Override
    public String convertToDatabaseColumn(String plain) {
        if (plain == null) return null;
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] ct = c.doFinal(plain.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + ct.length).put(iv).put(ct).array());
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String stored) {
        if (stored == null) return null;
        try {
            ByteBuffer buf = ByteBuffer.wrap(Base64.getDecoder().decode(stored));
            byte[] iv = new byte[12];
            buf.get(iv);
            byte[] ct = new byte[buf.remaining()];
            buf.get(ct);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(c.doFinal(ct), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }
}
