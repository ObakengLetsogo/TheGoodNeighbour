package za.co.thegoodneighbour.tgn.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.domain.OtpCode;
import za.co.thegoodneighbour.tgn.payment.SmsGateway;
import za.co.thegoodneighbour.tgn.repo.OtpCodeRepository;

/** Issues and checks SMS one-time codes: 6 digits, 10 minutes, 3 sent per hour, 5 attempts each. */
@Service
public class OtpService {
    static final int MAX_SENT_PER_HOUR = 3;
    static final int MAX_ATTEMPTS = 5;
    static final Duration TTL = Duration.ofMinutes(10);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpCodeRepository codes;
    private final SmsGateway sms;
    private final Clock clock;

    public OtpService(OtpCodeRepository codes, SmsGateway sms, Clock clock) {
        this.codes = codes; this.sms = sms; this.clock = clock;
    }

    public boolean smsEnabled() { return sms.isEnabled(); }

    public void requireSms() {
        if (!sms.isEnabled())
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Verification by SMS isn't switched on yet. Please contact us and we'll help.");
    }

    @Transactional
    public void issue(String phone, String purpose) {
        requireSms();
        Instant now = Instant.now(clock);
        if (codes.countByPhoneAndPurposeAndCreatedAtAfter(phone, purpose, now.minus(Duration.ofHours(1))) >= MAX_SENT_PER_HOUR)
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many codes requested. Please try again in an hour.");
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        String salt = UUID.randomUUID().toString();
        codes.save(new OtpCode(phone, purpose, salt, hash(salt, phone, purpose, code), now.plus(TTL)));
        sms.send(phone, "TGN: your code is " + code + ". It expires in 10 minutes. Never share it with anyone.");
    }

    /** Throws unless `code` is the latest live code for this phone and purpose. Failed attempts are kept even though we throw. */
    @Transactional(noRollbackFor = ApiException.class)
    public void verify(String phone, String purpose, String code) {
        Instant now = Instant.now(clock);
        OtpCode otp = codes.findFirstByPhoneAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(phone, purpose)
                .filter(c -> c.getExpiresAt().isAfter(now))
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That code isn't right or has expired. Please request a new one."));
        if (otp.getAttempts() >= MAX_ATTEMPTS)
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Too many attempts. Please request a new code.");
        otp.recordAttempt();
        boolean ok = MessageDigest.isEqual(hash(otp.getSalt(), phone, purpose, code).getBytes(StandardCharsets.UTF_8), otp.getCodeHash().getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            codes.save(otp);
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That code isn't right or has expired. Please request a new one.");
        }
        otp.markUsed(now);
        codes.save(otp);
    }

    private static String hash(String salt, String phone, String purpose, String code) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((salt + "|" + phone + "|" + purpose + "|" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
