package za.co.thegoodneighbour.tgn.api;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.config.WebConfig;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.domain.SupportRequest;
import za.co.thegoodneighbour.tgn.repo.AuditEventRepository;
import za.co.thegoodneighbour.tgn.repo.PolicyRepository;
import za.co.thegoodneighbour.tgn.repo.SupportRequestRepository;
import za.co.thegoodneighbour.tgn.service.*;

/** Customer-facing API (mobile apps) and the staff API (admin dashboard, /api/admin/**). */
public final class Controllers {
    private Controllers() {}

    /** Public: the cover catalogue and a live price quote. Cost to the company is never returned. */
    @RestController @RequestMapping("/api/cover")
    public static class CoverController {
        private final CoverService cover;
        public CoverController(CoverService cover) { this.cover = cover; }
        @GetMapping public CoverOptionsDto options() { return cover.options(); }
        @PostMapping("/quote") public QuoteDto quote(@Valid @RequestBody QuoteRequest r) {
            return cover.quote(r.items(), r.members(), r.holderDateOfBirth() == null ? null : java.time.LocalDate.parse(r.holderDateOfBirth()), null, !Boolean.FALSE.equals(r.coverMainMember()));
        }
    }

    /** Public: "tell me when you open". */
    @RestController @RequestMapping("/api/waitlist")
    public static class WaitlistController {
        private final WaitlistService waitlist;
        public WaitlistController(WaitlistService waitlist) { this.waitlist = waitlist; }
        @PostMapping @ResponseStatus(HttpStatus.ACCEPTED)
        public void join(jakarta.servlet.http.HttpServletRequest req, @Valid @RequestBody WaitlistIn in) { waitlist.join(req.getRemoteAddr(), in); }
    }

    @RestController @RequestMapping("/api/legal")
    public static class LegalController {
        private final LegalService legal;
        public LegalController(LegalService legal) { this.legal = legal; }
        @GetMapping public List<LegalSummaryDto> list() { return legal.list(); }
        @GetMapping("/{slug}") public LegalDocDto get(@PathVariable String slug) { return legal.get(slug); }
    }

    @RestController @RequestMapping("/api/auth")
    public static class AuthController {
        private final AuthService auth;
        private final AccountService account;
        public AuthController(AuthService auth, AccountService account) { this.auth = auth; this.account = account; }
        @PostMapping("/password-reset/request") @ResponseStatus(HttpStatus.ACCEPTED)
        public Accepted resetRequest(@Valid @RequestBody PhoneIn r) { return account.requestPasswordReset(r.phone()); }
        @PostMapping("/password-reset/confirm")
        public Accepted resetConfirm(@Valid @RequestBody PasswordResetConfirm r) { return account.confirmPasswordReset(r); }
        @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public SessionDto register(@Valid @RequestBody RegisterRequest r) { return auth.register(r); }
        @PostMapping("/login") public SessionDto login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }
    }

    @RestController @RequestMapping("/api/me")
    public static class MeController {
        private final AuthService auth;
        private final AccountService account;
        private final NotificationService inbox;
        private final ContributorService family;
        public MeController(AuthService auth, AccountService account, NotificationService inbox, ContributorService family) { this.auth = auth; this.account = account; this.inbox = inbox; this.family = family; }
        @GetMapping("/invitations") public InvitationsDto invitations(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return family.invitations(user); }
        @PostMapping("/invitations/{id}/accept") public SharedPolicyDto acceptInvitation(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @PathVariable String id) { return family.accept(user, id); }
        @PostMapping("/invitations/{id}/decline") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void declineInvitation(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @PathVariable String id) { family.decline(user, id); }
        @GetMapping("/shared-policies") public List<SharedPolicyDto> sharedPolicies(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return family.shared(user); }
        @PutMapping("/shared-policies/{id}/share")
        public SharedPolicyDto updateShare(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @PathVariable String id, @Valid @RequestBody SharePercentIn in) { return family.updateMyShare(user, id, in.sharePercent()); }
        @PostMapping("/shared-policies/{id}/leave") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void leaveShared(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @PathVariable String id) { family.leave(user, id); }
        @GetMapping("/notifications") public NotificationsDto notifications(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return inbox.list(user); }
        @PostMapping("/notifications/read-all") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void readAll(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { inbox.markAllRead(user); }
        @PostMapping("/notifications/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void readOne(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @PathVariable String id) { inbox.markRead(user, id); }
        @GetMapping public MeDto me(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return account.me(user); }
        @PutMapping public UserDto update(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody ProfileRequest r) { return auth.updateProfile(user, r); }
        @PostMapping("/password") public SessionDto password(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody ChangePasswordIn r) { return account.changePassword(user, r); }
        @PostMapping("/phone-verification/start") @ResponseStatus(HttpStatus.ACCEPTED)
        public Accepted verifyStart(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return account.startPhoneVerification(user); }
        @PostMapping("/phone-verification/confirm")
        public MeDto verifyConfirm(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody CodeIn r) { return account.confirmPhoneVerification(user, r.code()); }
        @PostMapping("/phone/start") @ResponseStatus(HttpStatus.ACCEPTED)
        public Accepted phoneStart(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody PhoneIn r) { return account.startChangePhone(user, r.phone()); }
        @PostMapping("/phone/confirm")
        public MeDto phoneConfirm(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody ChangePhoneConfirm r) { return account.confirmChangePhone(user, r); }
        @PutMapping("/notifications") public UserDto notifications(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @RequestBody NotificationsIn r) { return account.setNotifications(user, r); }
        @PostMapping("/sign-out-all") public Accepted signOutAll(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return account.signOutEverywhere(user); }
        @PostMapping("/delete") public DeleteAccountResult delete(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody DeleteAccountIn r) { return account.deleteAccount(user, r.password()); }
    }

    @RestController @RequestMapping("/api/policies")
    public static class PolicyController {
        private final PolicyService policies;
        private final ContributorService family;
        private final WishService wishService;
        public PolicyController(PolicyService policies, ContributorService family, WishService wishService) { this.policies = policies; this.family = family; this.wishService = wishService; }

        @GetMapping("/{id}/wishes") public List<WishDto> wishes(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id) { return wishService.list(u, id); }
        @PutMapping("/{id}/wishes/{memberKey}")
        public WishDto saveWish(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String memberKey, @Valid @RequestBody WishIn in) { return wishService.save(u, id, memberKey, in); }
        @PostMapping("/{id}/contributors") @ResponseStatus(HttpStatus.CREATED)
        public PolicyDto invite(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody InviteContributorIn in) { family.invite(u, id, in); return policies.get(u, id); }
        @DeleteMapping("/{id}/contributors/{contributorId}")
        public PolicyDto removeContributor(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String contributorId) { family.removeContributor(u, id, contributorId); return policies.get(u, id); }

        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public PolicyDto apply(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @Valid @RequestBody ApplyRequest r) { return policies.apply(u, r); }
        @GetMapping public List<PolicyDto> list(@RequestAttribute(WebConfig.USER_ATTR) AppUser u) { return policies.list(u); }
        @GetMapping("/{id}") public PolicyDto get(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id) { return policies.get(u, id); }
        @PostMapping("/{id}/members") @ResponseStatus(HttpStatus.CREATED)
        public PolicyDto addMember(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody MemberIn m) { return policies.addMember(u, id, m); }
        @PutMapping("/{id}/members/{memberId}")
        public PolicyDto editMember(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String memberId, @Valid @RequestBody EditMemberIn e) { return policies.editMember(u, id, memberId, e); }
        @DeleteMapping("/{id}/members/{memberId}")
        public PolicyDto removeMember(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String memberId) { return policies.removeMember(u, id, memberId); }
        @PostMapping("/{id}/cancel-request")
        public PolicyDto cancel(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody(required = false) CancelRequestIn r) { return policies.requestCancel(u, id, r); }
        @DeleteMapping("/{id}/cancel-request")
        public PolicyDto keep(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id) { return policies.keepCover(u, id); }
        @PostMapping("/{id}/reinstate-request")
        public PolicyDto reinstate(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody(required = false) ReinstateRequestIn r) { return policies.requestReinstate(u, id, r); }
        @PostMapping("/{id}/bundle")
        public PolicyDto changeBundle(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody BundleChangeRequest r) { return policies.changeBundle(u, id, r); }
        @PostMapping("/{id}/debit-order")
        public DebitOrderState debitOrder(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id) { return policies.setUpDebitOrder(u, id); }
    }

    @RestController @RequestMapping("/api/claims")
    public static class ClaimController {
        private final ClaimService claims;
        public ClaimController(ClaimService claims) { this.claims = claims; }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public ClaimDto submit(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @Valid @RequestBody ClaimIn in) { return claims.submit(u, in); }
        @GetMapping public List<ClaimDto> list(@RequestAttribute(WebConfig.USER_ATTR) AppUser u) { return claims.list(u); }

        @PostMapping(path = "/{id}/documents", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED)
        public ClaimDocumentDto upload(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @RequestParam("type") String type,
                                       @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException { return claims.addDocument(u, id, type, file); }
        @PutMapping("/{id}/choice")
        public ClaimDto choice(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody ClaimChoiceIn in) { return claims.setChoice(u, id, in.choice()); }
        @GetMapping("/{id}/documents/{docId}/file")
        public org.springframework.http.ResponseEntity<byte[]> file(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String docId) { return fileResponse(claims.download(u, id, docId)); }
        @DeleteMapping("/{id}/documents/{docId}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void remove(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String docId) { claims.removeDocument(u, id, docId); }
    }

    @RestController @RequestMapping("/api/support-requests")
    public static class SupportController {
        private final SupportRequestRepository requests;
        public SupportController(SupportRequestRepository requests) { this.requests = requests; }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public void submit(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @Valid @RequestBody SupportRequestIn r) {
            requests.save(new SupportRequest(u.getId(), r.kind(), r.reference(), r.message().trim(), r.contactPhone()));
        }
    }

    // ---------------- staff ----------------

    @RestController @RequestMapping("/api/admin")
    public static class AdminController {
        private final StaffAuthService staffAuth;
        private final PolicyService policies;
        private final ClaimService claims;
        private final CoverAdminService coverAdmin;
        private final AdminDirectoryService directory;
        private final LegalService legal;
        private final AuditEventRepository audit;
        private final WaitlistService waitlist;
        private final WishService wishService;
        private final PolicyRepository policyRepo;

        public AdminController(StaffAuthService staffAuth, PolicyService policies, ClaimService claims, CoverAdminService coverAdmin,
                               AdminDirectoryService directory, LegalService legal, AuditEventRepository audit, WaitlistService waitlist, WishService wishService, PolicyRepository policyRepo) {
            this.wishService = wishService; this.policyRepo = policyRepo; this.waitlist = waitlist;
            this.staffAuth = staffAuth; this.policies = policies; this.claims = claims; this.coverAdmin = coverAdmin; this.directory = directory; this.legal = legal; this.audit = audit;
        }

        @PostMapping("/auth/login") public StaffSessionDto login(@Valid @RequestBody StaffLoginRequest r) { return staffAuth.login(r); }
        @GetMapping("/me") public StaffDto me(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s) { return StaffAuthService.toDto(s); }
        @GetMapping("/dashboard") public Dashboard dashboard() { return policies.dashboard(claims.openCount()); }

        @GetMapping("/collections") public CollectionsDto collections() { return policies.collections(); }
        @GetMapping("/policies") public List<AdminPolicyDto> policies(@RequestParam(required = false) String status) { return policies.adminList(status); }
        @GetMapping("/policies/{id}") public AdminPolicyDto policy(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id) { return policies.adminGet(s, id); }
        @PostMapping("/policies/{id}/status")
        public AdminPolicyDto policyStatus(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody StatusChange c) { return policies.setStatus(s, id, c); }
        @GetMapping("/policies/{id}/wishes")
        public List<WishDto> adminWishes(@PathVariable String id) { return wishService.forPolicy(policyRepo.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that policy.")), true); }
        @PostMapping("/policies/{id}/successor")
        public AdminPolicyDto successor(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody SuccessorIn in) { return policies.setSuccessor(s, id, in); }
        @PutMapping("/policies/{id}/members/{memberId}")
        public AdminPolicyDto adminEditMember(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @PathVariable String memberId, @Valid @RequestBody EditMemberIn e) { return policies.adminEditMember(s, id, memberId, e); }
        @PostMapping("/policies/{id}/payments") @ResponseStatus(HttpStatus.CREATED)
        public AdminPolicyDto payment(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody RecordPayment r) { return policies.recordPayment(s, id, r); }

        @GetMapping("/claims") public List<ClaimDto> claims() { return claims.adminList(); }
        @GetMapping("/claims/{id}/documents/{docId}/file")
        public org.springframework.http.ResponseEntity<byte[]> claimFile(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @PathVariable String docId) { return fileResponse(claims.adminDownload(s, id, docId)); }
        @PostMapping("/claims/{id}/delivery")
        public ClaimDto claimDelivery(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody ScheduleDelivery d) { return claims.scheduleDelivery(s, id, d); }
        @PostMapping("/claims/{id}/status")
        public ClaimDto claimStatus(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody StatusChange c) { return claims.setStatus(s, id, c); }

        @GetMapping("/cover") public CoverConfigDto cover() { return coverAdmin.config(); }
        @PutMapping("/cover")
        public CoverConfigDto updateCover(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @Valid @RequestBody CoverConfigDto u) { return coverAdmin.updateConfig(s, u); }
        @GetMapping("/benefits") public List<BenefitItemAdminDto> benefits() { return coverAdmin.listItems(); }
        @PutMapping("/benefits/{id}")
        public BenefitItemAdminDto updateBenefit(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody BenefitItemUpdate u) { return coverAdmin.updateItem(s, id, u); }
        @GetMapping("/herd") public List<HerdDto> herd() { return coverAdmin.herd(); }

        @GetMapping("/support") public List<SupportItemDto> support() { return directory.inbox(); }
        @PostMapping("/support/{id}/status")
        public SupportItemDto supportStatus(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody StatusChange c) { return directory.setStatus(s, id, c); }
        @GetMapping("/waitlist") public List<WaitlistItemDto> waitlist() { return waitlist.list(); }
        @DeleteMapping("/waitlist/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void waitlistRemove(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id) { waitlist.remove(s, id); }
        @GetMapping("/customers") public List<CustomerDto> customers() { return directory.customers(); }

        @GetMapping("/legal") public List<LegalSummaryDto> legalList() { return legal.list(); }
        @GetMapping("/legal/{slug}") public LegalDocDto legalGet(@PathVariable String slug) { return legal.get(slug); }
        @PutMapping("/legal/{slug}")
        public LegalDocDto legalUpdate(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String slug, @Valid @RequestBody LegalUpdate u) { return legal.update(s, slug, u); }

        @GetMapping("/audit")
        public List<AuditDto> audit() {
            return audit.findTop200ByOrderByAtDesc().stream().map(e -> new AuditDto(e.getAt().toString(), e.getActor(), e.getAction(), e.getEntityType(), e.getEntityId(), e.getDetail())).toList();
        }
    }

    /** Files are served inline with the type we detected, never sniffed, and are never cached. */
    static org.springframework.http.ResponseEntity<byte[]> fileResponse(ClaimService.Download d) {
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Type", d.contentType())
                .header("Content-Disposition", "inline; filename=\"" + d.fileName() + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .header("Cache-Control", "no-store")
                .body(d.bytes());
    }
}
