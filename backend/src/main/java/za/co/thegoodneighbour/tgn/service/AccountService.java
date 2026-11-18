package za.co.thegoodneighbour.tgn.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.SupportRequest;
import za.co.thegoodneighbour.tgn.repo.*;

/** The customer's own security and privacy settings: passwords, phone number, notifications, deletion. */
@Service
public class AccountService {
    private static final String GENERIC_CODE_ERROR = "That code isn't right or has expired. Please request a new one.";
    private final AppUserRepository users;
    private final AuthTokenRepository tokens;
    private final PolicyRepository policies;
    private final ClaimRepository claims;
    private final SupportRequestRepository support;
    private final OtpService otp;
    private final AuthService auth;
    private final za.co.thegoodneighbour.tgn.repo.NotificationRepository notifications;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AccountService(AppUserRepository users, AuthTokenRepository tokens, PolicyRepository policies, ClaimRepository claims,
                          SupportRequestRepository support, OtpService otp, AuthService auth,
                          za.co.thegoodneighbour.tgn.repo.NotificationRepository notifications) {
        this.notifications = notifications; this.users = users; this.tokens = tokens; this.policies = policies; this.claims = claims; this.support = support; this.otp = otp; this.auth = auth;
    }

    @Transactional(readOnly = true)
    public MeDto me(AppUser u) { return new MeDto(AuthService.toDto(fresh(u)), otp.smsEnabled()); }

    // ---------- forgotten password ----------

    /** Always answers the same way, so it can't be used to discover which numbers have accounts. */
    @Transactional
    public Accepted requestPasswordReset(String phone) {
        otp.requireSms();
        if (users.findByPhone(phone).isPresent()) {
            try { otp.issue(phone, "reset_password"); } catch (ApiException e) { if (e.status() != HttpStatus.TOO_MANY_REQUESTS) throw e; }
        }
        return new Accepted("If that number has an account, we've sent it a code.");
    }

    /** Wrong codes count as attempts, and that count must survive the failure. */
    @Transactional(noRollbackFor = ApiException.class)
    public Accepted confirmPasswordReset(PasswordResetConfirm r) {
        otp.requireSms();
        otp.verify(r.phone(), "reset_password", r.code());
        AppUser u = users.findByPhone(r.phone()).orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, GENERIC_CODE_ERROR));
        u.setPasswordHash(encoder.encode(r.newPassword()));
        u.clearFailedLogins();
        users.save(u);
        tokens.deleteCustomerTokens(u.getId());
        return new Accepted("Your password has been changed. Please sign in.");
    }

    // ---------- password, phone, notifications ----------

    @Transactional
    public SessionDto changePassword(AppUser u, ChangePasswordIn r) {
        AppUser user = fresh(u);
        if (!encoder.matches(r.currentPassword(), user.getPasswordHash())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Your current password isn't right.");
        user.setPasswordHash(encoder.encode(r.newPassword()));
        users.save(user);
        tokens.deleteCustomerTokens(user.getId());   // every other device is signed out
        return auth.newSession(user);
    }

    @Transactional
    public Accepted startPhoneVerification(AppUser u) {
        otp.issue(fresh(u).getPhone(), "verify_phone");
        return new Accepted("We've sent a code to your number.");
    }

    /** Wrong codes count as attempts, and that count must survive the failure. */
    @Transactional(noRollbackFor = ApiException.class)
    public MeDto confirmPhoneVerification(AppUser u, String code) {
        AppUser user = fresh(u);
        otp.verify(user.getPhone(), "verify_phone", code);
        user.markPhoneVerified();
        users.save(user);
        return new MeDto(AuthService.toDto(user), true);
    }

    @Transactional
    public Accepted startChangePhone(AppUser u, String newPhone) {
        AppUser user = fresh(u);
        if (user.getPhone().equals(newPhone)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That's already your number.");
        if (users.findByPhone(newPhone).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "That number already has an account.");
        otp.issue(newPhone, "change_phone");
        return new Accepted("We've sent a code to your new number.");
    }

    /** Wrong codes count as attempts, and that count must survive the failure. */
    @Transactional(noRollbackFor = ApiException.class)
    public MeDto confirmChangePhone(AppUser u, ChangePhoneConfirm r) {
        AppUser user = fresh(u);
        if (users.findByPhone(r.newPhone()).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "That number already has an account.");
        otp.verify(r.newPhone(), "change_phone", r.code());
        user.changePhone(r.newPhone());
        users.save(user);
        return new MeDto(AuthService.toDto(user), true);
    }

    @Transactional
    public UserDto setNotifications(AppUser u, NotificationsIn n) {
        AppUser user = fresh(u);
        user.setNotifications(n.claims(), n.payments(), n.news());
        return AuthService.toDto(users.save(user));
    }

    @Transactional
    public Accepted signOutEverywhere(AppUser u) {
        tokens.deleteCustomerTokens(u.getId());
        return new Accepted("You've been signed out of all devices.");
    }

    /**
     * POPIA: customers can ask us to delete their data. With no cover or claims on file we delete everything straight away.
     * Otherwise cover and claim records may need to be kept, so we log a request for staff to handle and tell the customer.
     */
    @Transactional
    public DeleteAccountResult deleteAccount(AppUser u, String password) {
        AppUser user = fresh(u);
        if (!encoder.matches(password, user.getPasswordHash())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That password isn't right.");
        boolean hasRecords = !policies.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty() || !claims.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty();
        if (hasRecords) {
            support.save(new SupportRequest(user.getId(), "deletion_request", null, "Customer asked to delete their account and personal data.", user.getPhone()));
            return new DeleteAccountResult("requested", "We've received your request. Because you have a cover or claim on file, our team needs to review it first and will contact you.");
        }
        tokens.deleteCustomerTokens(user.getId());
        support.deleteByUserId(user.getId());
        notifications.deleteByUserId(user.getId());
        users.delete(user);
        return new DeleteAccountResult("deleted", "Your account and personal information have been deleted.");
    }

    private AppUser fresh(AppUser u) { return users.findById(u.getId()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.")); }
}
