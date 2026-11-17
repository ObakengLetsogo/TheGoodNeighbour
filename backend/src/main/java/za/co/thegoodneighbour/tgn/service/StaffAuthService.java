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

    @Transactional
    public StaffSessionDto login(StaffLoginRequest r) {
        StaffUser user = staff.findByEmail(r.email().trim().toLowerCase())
                .filter(u -> encoder.matches(r.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "That email and password don't match."));
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
