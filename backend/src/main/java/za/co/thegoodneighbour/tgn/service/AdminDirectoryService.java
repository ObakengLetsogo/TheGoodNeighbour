package za.co.thegoodneighbour.tgn.service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.Policy;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.domain.SupportRequest;
import za.co.thegoodneighbour.tgn.repo.AppUserRepository;
import za.co.thegoodneighbour.tgn.repo.PolicyRepository;
import za.co.thegoodneighbour.tgn.repo.SupportRequestRepository;

/** Staff views of customers and the support inbox (including account deletion requests). */
@Service
public class AdminDirectoryService {
    private static final Set<String> STATUSES = Set.of("open", "in_progress", "resolved");
    private final AppUserRepository users;
    private final PolicyRepository policies;
    private final SupportRequestRepository support;
    private final AuditService audit;

    public AdminDirectoryService(AppUserRepository users, PolicyRepository policies, SupportRequestRepository support, AuditService audit) {
        this.users = users; this.policies = policies; this.support = support; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<SupportItemDto> inbox() {
        Map<String, AppUser> byId = users.findAll().stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
        return support.findAllByOrderByCreatedAtDesc().stream().map(s -> toDto(s, byId.get(s.getUserId()))).toList();
    }

    @Transactional
    public SupportItemDto setStatus(StaffUser staff, String id, StatusChange c) {
        if (!STATUSES.contains(c.status())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unknown status.");
        SupportRequest s = support.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that request."));
        String from = s.getStatus();
        s.setStatus(c.status(), c.note());
        audit.record(staff.getEmail(), "support.status", "support_request", id, s.getKind() + ": " + from + " -> " + c.status() + (c.note() == null ? "" : ": " + c.note()));
        return toDto(support.save(s), users.findById(s.getUserId()).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<CustomerDto> customers() {
        Map<String, Policy> latest = policies.findAllByOrderByCreatedAtDesc().stream().collect(Collectors.toMap(Policy::getUserId, Function.identity(), (a, b) -> a));
        return users.findAll().stream().sorted(java.util.Comparator.comparing(AppUser::getCreatedAt).reversed()).map(u -> {
            Policy p = latest.get(u.getId());
            return new CustomerDto(u.getId(), u.getFullName(), u.getPhone(), u.getEmail(), u.isPhoneVerified(),
                    DateTimeFormatter.ISO_INSTANT.format(u.getCreatedAt().atOffset(ZoneOffset.UTC)),
                    p == null ? null : p.getId(), p == null ? null : p.getReference(), p == null ? null : p.getStatus());
        }).toList();
    }

    private static SupportItemDto toDto(SupportRequest s, AppUser u) {
        return new SupportItemDto(s.getId(), s.getKind(), s.getOrderRef(), s.getMessage(), s.getContactPhone(), s.getStatus(), s.getStaffNote(),
                DateTimeFormatter.ISO_INSTANT.format(s.getCreatedAt().atOffset(ZoneOffset.UTC)), u == null ? null : AuthService.toDto(u));
    }
}
