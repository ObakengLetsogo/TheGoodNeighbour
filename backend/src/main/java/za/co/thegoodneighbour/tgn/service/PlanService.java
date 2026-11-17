package za.co.thegoodneighbour.tgn.service;

import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.Plan;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.repo.PlanRepository;

@Service
public class PlanService {
    private final PlanRepository plans;
    private final AuditService audit;

    public PlanService(PlanRepository plans, AuditService audit) { this.plans = plans; this.audit = audit; }

    @Transactional(readOnly = true)
    public List<PlanDto> listPublic() {
        return plans.findAll(Sort.by("sortOrder")).stream().filter(Plan::isActive).map(PlanService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PlanDto> listAll() {
        return plans.findAll(Sort.by("sortOrder")).stream().map(PlanService::toDto).toList();
    }

    @Transactional
    public PlanDto update(StaffUser staff, String id, PlanUpdate u) {
        if (u.minAge() > u.maxAge()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The minimum age can't be above the maximum age.");
        List<Plan.MemberRule> rules = u.memberRules().stream().map(r -> {
            if (!Plan.MEMBER_TYPES.contains(r.type())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unknown member type: " + r.type());
            if (r.minAge() > r.maxAge()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Check the age limits for " + r.type() + ".");
            return new Plan.MemberRule(r.type(), r.feeCents(), r.coverCents(), r.maxCount(), r.minAge(), r.maxAge());
        }).toList();
        Plan plan = plans.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that plan."));
        String before = "premium=" + plan.getPremiumCents() + " cover=" + plan.getCoverCents() + " active=" + plan.isActive();
        plan.update(u.name().trim(), u.description(), u.coverCents(), u.premiumCents(), u.waitingPeriodDays(), u.minAge(), u.maxAge(), u.active(), rules);
        audit.record(staff.getEmail(), "plan.updated", "plan", id, before + " -> premium=" + u.premiumCents() + " cover=" + u.coverCents() + " active=" + u.active());
        return toDto(plans.save(plan));
    }

    static PlanDto toDto(Plan p) {
        return new PlanDto(p.getId(), p.getName(), p.getDescription(), p.getCoverCents(), p.getPremiumCents(), p.getWaitingPeriodDays(),
                p.getMinAge(), p.getMaxAge(), p.getAccent(), p.isActive(),
                p.getMemberRules().stream().map(r -> new MemberRuleDto(r.type(), r.feeCents(), r.coverCents(), r.maxCount(), r.minAge(), r.maxAge())).toList());
    }
}
