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
        @PostMapping("/quote") public QuoteDto quote(@Valid @RequestBody QuoteRequest r) { return cover.quote(r.items(), r.members(), null); }
    }

    @RestController @RequestMapping("/api/auth")
    public static class AuthController {
        private final AuthService auth;
        public AuthController(AuthService auth) { this.auth = auth; }
        @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public SessionDto register(@Valid @RequestBody RegisterRequest r) { return auth.register(r); }
        @PostMapping("/login") public SessionDto login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }
    }

    @RestController @RequestMapping("/api/me")
    public static class MeController {
        private final AuthService auth;
        public MeController(AuthService auth) { this.auth = auth; }
        @PutMapping public UserDto update(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody ProfileRequest r) { return auth.updateProfile(user, r); }
    }

    @RestController @RequestMapping("/api/policies")
    public static class PolicyController {
        private final PolicyService policies;
        public PolicyController(PolicyService policies) { this.policies = policies; }

        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public PolicyDto apply(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @Valid @RequestBody ApplyRequest r) { return policies.apply(u, r); }
        @GetMapping public List<PolicyDto> list(@RequestAttribute(WebConfig.USER_ATTR) AppUser u) { return policies.list(u); }
        @GetMapping("/{id}") public PolicyDto get(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id) { return policies.get(u, id); }
        @PostMapping("/{id}/members") @ResponseStatus(HttpStatus.CREATED)
        public PolicyDto addMember(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @Valid @RequestBody MemberIn m) { return policies.addMember(u, id, m); }
        @DeleteMapping("/{id}/members/{memberId}")
        public PolicyDto removeMember(@RequestAttribute(WebConfig.USER_ATTR) AppUser u, @PathVariable String id, @PathVariable String memberId) { return policies.removeMember(u, id, memberId); }
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
        private final AuditEventRepository audit;

        public AdminController(StaffAuthService staffAuth, PolicyService policies, ClaimService claims, CoverAdminService coverAdmin, AuditEventRepository audit) {
            this.staffAuth = staffAuth; this.policies = policies; this.claims = claims; this.coverAdmin = coverAdmin; this.audit = audit;
        }

        @PostMapping("/auth/login") public StaffSessionDto login(@Valid @RequestBody StaffLoginRequest r) { return staffAuth.login(r); }
        @GetMapping("/me") public StaffDto me(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s) { return StaffAuthService.toDto(s); }
        @GetMapping("/dashboard") public Dashboard dashboard() { return policies.dashboard(claims.openCount()); }

        @GetMapping("/policies") public List<AdminPolicyDto> policies(@RequestParam(required = false) String status) { return policies.adminList(status); }
        @GetMapping("/policies/{id}") public AdminPolicyDto policy(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id) { return policies.adminGet(s, id); }
        @PostMapping("/policies/{id}/status")
        public AdminPolicyDto policyStatus(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody StatusChange c) { return policies.setStatus(s, id, c); }
        @PostMapping("/policies/{id}/payments") @ResponseStatus(HttpStatus.CREATED)
        public AdminPolicyDto payment(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody RecordPayment r) { return policies.recordPayment(s, id, r); }

        @GetMapping("/claims") public List<ClaimDto> claims() { return claims.adminList(); }
        @PostMapping("/claims/{id}/status")
        public ClaimDto claimStatus(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody StatusChange c) { return claims.setStatus(s, id, c); }

        @GetMapping("/cover") public CoverConfigDto cover() { return coverAdmin.config(); }
        @PutMapping("/cover")
        public CoverConfigDto updateCover(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @Valid @RequestBody CoverConfigDto u) { return coverAdmin.updateConfig(s, u); }
        @GetMapping("/benefits") public List<BenefitItemAdminDto> benefits() { return coverAdmin.listItems(); }
        @PutMapping("/benefits/{id}")
        public BenefitItemAdminDto updateBenefit(@RequestAttribute(WebConfig.STAFF_ATTR) StaffUser s, @PathVariable String id, @Valid @RequestBody BenefitItemUpdate u) { return coverAdmin.updateItem(s, id, u); }
        @GetMapping("/herd") public List<HerdDto> herd() { return coverAdmin.herd(); }

        @GetMapping("/audit")
        public List<AuditDto> audit() {
            return audit.findTop200ByOrderByAtDesc().stream().map(e -> new AuditDto(e.getAt().toString(), e.getActor(), e.getAction(), e.getEntityType(), e.getEntityId(), e.getDetail())).toList();
        }
    }
}
