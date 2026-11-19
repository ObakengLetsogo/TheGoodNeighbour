package za.co.thegoodneighbour.tgn.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.AuthToken;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.repo.AuthTokenRepository;
import za.co.thegoodneighbour.tgn.repo.StaffUserRepository;

@Service
public class StaffAuthService {
    private static final Duration TOKEN_TTL = Duration.ofHours(12);
    private static final SecureRandom RANDOM = new SecureRandom();
    private final StaffUserRepository staff;
    private final AuthTokenRepository tokens;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public StaffAuthService(StaffUserRepository staff, AuthTokenRepository tokens) {
        this.staff = staff; this.tokens = tokens;
    }

    /** Five wrong passwords for one email lock staff sign-in for that email for 15 minutes. Held in memory: it resets on restart, which is fine for a lockout. */
    private static final int MAX_FAILURES = 5;
    private static final java.time.Duration LOCK = java.time.Duration.ofMinutes(15);
    private final java.util.concurrent.ConcurrentHashMap<String, java.util.ArrayDeque<Instant>> failures = new java.util.concurrent.ConcurrentHashMap<>();
    /** A real bcrypt hash of nothing in particular, so an unknown email costs the same time as a wrong password. */
    private final String dummyHash = encoder.encode("not-a-real-password");

    @Transactional
    public StaffSessionDto login(StaffLoginRequest r) {
        String email = r.email().trim().toLowerCase();
        if (failures.size() > 10_000) failures.clear();   // random emails can't grow this without limit
        var recent = failures.computeIfAbsent(email, k -> new java.util.ArrayDeque<>());
        synchronized (recent) {
            Instant cutoff = Instant.now().minus(LOCK);
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) recent.pollFirst();
            if (recent.size() >= MAX_FAILURES) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again in 15 minutes.");
        }
        Optional<StaffUser> found = staff.findByEmail(email);
        boolean good = encoder.matches(r.password(), found.map(StaffUser::getPasswordHash).orElse(dummyHash)) && found.isPresent();
        if (!good) {
            synchronized (recent) { recent.addLast(Instant.now()); }
            throw new ApiException(HttpStatus.UNAUTHORIZED, "That email and password don't match.");
        }
        synchronized (recent) { recent.clear(); }
        StaffUser user = found.get();
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = HexFormat.of().formatHex(raw);
        tokens.save(new AuthToken(AuthService.hash(token), user.getId(), Instant.now().plus(TOKEN_TTL), true));
        return new StaffSessionDto(toDto(user), token);
    }

    @Transactional(readOnly = true)
    public Optional<StaffUser> authenticate(String token) {
        return tokens.findById(AuthService.hash(token))
                .filter(t -> t.isStaff() && t.getExpiresAt().isAfter(Instant.now()))
                .flatMap(t -> staff.findById(t.getUserId()));
    }

    @Transactional
    public void createIfNone(String email, String password) {
        if (staff.count() == 0 && email != null && !email.isBlank() && password != null && password.length() >= 12)
            staff.save(new StaffUser(email.trim(), "Administrator", encoder.encode(password)));
    }

    public static StaffDto toDto(StaffUser u) { return new StaffDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole()); }
}
