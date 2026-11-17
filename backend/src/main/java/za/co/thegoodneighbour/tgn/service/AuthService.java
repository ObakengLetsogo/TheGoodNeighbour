package za.co.thegoodneighbour.tgn.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.AuthToken;
import za.co.thegoodneighbour.tgn.repo.AppUserRepository;
import za.co.thegoodneighbour.tgn.repo.AuthTokenRepository;

@Service
public class AuthService {
    private static final Duration TOKEN_TTL = Duration.ofDays(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppUserRepository users;
    private final AuthTokenRepository tokens;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(AppUserRepository users, AuthTokenRepository tokens) {
        this.users = users; this.tokens = tokens;
    }

    @Transactional
    public SessionDto register(RegisterRequest r) {
        if (users.findByPhone(r.phone()).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "That mobile number already has an account. Try signing in instead.");
        AppUser user = users.save(new AppUser(r.fullName().trim(), r.phone(), blankToNull(r.email()), encoder.encode(r.password())));
        return session(user);
    }

    @Transactional
    public SessionDto login(LoginRequest r) {
        AppUser user = users.findByPhone(r.phone()).filter(u -> encoder.matches(r.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "That number and password don't match. Please check and try again."));
        return session(user);
    }

    @Transactional
    public UserDto updateProfile(AppUser user, ProfileRequest r) {
        user.updateProfile(r.fullName().trim(), blankToNull(r.email()));
        return toDto(users.save(user));
    }

    @Transactional(readOnly = true)
    public Optional<AppUser> authenticate(String bearerToken) {
        return tokens.findById(hash(bearerToken))
                .filter(t -> t.getExpiresAt().isAfter(Instant.now()))
                .flatMap(t -> users.findById(t.getUserId()));
    }

    public static UserDto toDto(AppUser u) {
        return new UserDto(u.getId(), u.getFullName(), u.getPhone(), u.getEmail());
    }

    private SessionDto session(AppUser user) {
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = HexFormat.of().formatHex(raw);
        tokens.save(new AuthToken(hash(token), user.getId(), Instant.now().plus(TOKEN_TTL)));
        return new SessionDto(toDto(user), token);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
