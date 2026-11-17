package za.co.thegoodneighbour.tgn.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.BenefitItem;
import za.co.thegoodneighbour.tgn.domain.CoverConfig;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.repo.BenefitItemRepository;
import za.co.thegoodneighbour.tgn.repo.CoverConfigRepository;

/** Staff control of pricing, rules, the bundle catalogue and the herd. Every change is audited. */
@Service
public class CoverAdminService {
    private final CoverService cover;
    private final CoverConfigRepository configs;
    private final BenefitItemRepository items;
    private final AuditService audit;

    public CoverAdminService(CoverService cover, CoverConfigRepository configs, BenefitItemRepository items, AuditService audit) {
        this.cover = cover; this.configs = configs; this.items = items; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public CoverConfigDto config() { return toDto(cover.config()); }

    @Transactional
    public CoverConfigDto updateConfig(StaffUser staff, CoverConfigDto u) {
        if (u.mainMinAge() > u.mainMaxAge() || u.mainMaxAge() > u.mainCoverEndAge()) throw bad("Check the main member's age limits.");
        Set<String> seen = new HashSet<>();
        List<CoverConfig.RelationshipRule> rules = u.relationships().stream().map(r -> {
            if (!CoverConfig.RELATIONSHIPS.contains(r.relationship())) throw bad("Unknown relationship: " + r.relationship());
            if (!seen.add(r.relationship())) throw bad("Each relationship can only appear once.");
            if (r.minAge() > r.maxAge() || r.maxAge() > r.coverEndAge()) throw bad("Check the age limits for " + r.relationship() + ".");
            return new CoverConfig.RelationshipRule(r.relationship(), r.multiplierBps(), r.minAge(), r.maxAge(), r.coverEndAge(), r.maxCount());
        }).toList();
        List<AgeBandDto> bands = u.ageBands().stream().sorted(java.util.Comparator.comparingInt(AgeBandDto::fromAge)).toList();
        if (bands.isEmpty()) throw bad("Add at least one age band.");
        if (bands.get(0).fromAge() != 0) throw bad("The first age band must start at 0.");
        for (int i = 0; i < bands.size(); i++) {
            if (bands.get(i).fromAge() > bands.get(i).toAge()) throw bad("Check the age band " + bands.get(i).fromAge() + " to " + bands.get(i).toAge() + ".");
            if (i > 0 && bands.get(i).fromAge() != bands.get(i - 1).toAge() + 1) throw bad("Age bands must follow on from each other with no gaps or overlaps.");
        }
        if (bands.get(bands.size() - 1).toAge() < 110) throw bad("The last age band must reach at least age 110.");
        CoverConfig c = cover.config();
        String before = "rate=" + c.getBaseRateBps() + "bps natural=" + c.getNaturalWaitingDays() + "d min=" + c.getMinBundleValueCents();
        c.apply(u.baseRateBps(), u.minBundleValueCents(), u.naturalWaitingDays(), u.accidentalWaitingDays(), u.upgradeWaitingDays(), u.mainMinAge(),
                u.mainMaxAge(), u.mainCoverEndAge(), u.maxMembers(), u.maxCommitmentMultiple(), u.lapseAfterMissedPayments(), u.reinstateWithinDays(),
                u.escalationCapBps(), u.coolingOffDays(), rules,
                bands.stream().map(b -> new CoverConfig.AgeBand(b.fromAge(), b.toAge(), b.multiplierBps())).toList());
        audit.record(staff.getEmail(), "cover.config.updated", "cover_config", CoverConfig.ID,
                before + " -> rate=" + u.baseRateBps() + "bps natural=" + u.naturalWaitingDays() + "d min=" + u.minBundleValueCents());
        return toDto(configs.save(c));
    }

    @Transactional(readOnly = true)
    public List<BenefitItemAdminDto> listItems() {
        return items.findAll(Sort.by("sortOrder")).stream().map(CoverAdminService::toDto).toList();
    }

    @Transactional
    public BenefitItemAdminDto updateItem(StaffUser staff, String id, BenefitItemUpdate u) {
        BenefitItem item = items.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that item."));
        if ("livestock".equals(item.getKind()) && u.onFarm() == null) throw bad("Please say how many animals are on the farm.");
        String before = "value=" + item.getValueCents() + " cost=" + item.getCostCents() + " onFarm=" + item.getOnFarm() + " active=" + item.isActive();
        item.update(u.name().trim(), u.description(), u.valueCents(), u.costCents(), u.maxQty(), u.active(), "livestock".equals(item.getKind()) ? u.onFarm() : null, u.contents());
        audit.record(staff.getEmail(), "cover.item.updated", "benefit_item", id,
                before + " -> value=" + u.valueCents() + " cost=" + u.costCents() + " onFarm=" + u.onFarm() + " active=" + u.active());
        return toDto(items.save(item));
    }

    /** The herd: animals on the farm, animals promised under open covers, and how much more we may promise. */
    @Transactional(readOnly = true)
    public List<HerdDto> herd() {
        CoverConfig cfg = cover.config();
        Map<String, Long> promised = cover.promisedByItem(null);
        return items.findAll(Sort.by("sortOrder")).stream().filter(i -> "livestock".equals(i.getKind()) && i.getOnFarm() != null).map(i -> {
            long cap = (long) i.getOnFarm() * cfg.getMaxCommitmentMultiple();
            long p = promised.getOrDefault(i.getId(), 0L);
            return new HerdDto(i.getId(), i.getName(), i.getOnFarm(), p, cap, Math.max(0, cap - p));
        }).toList();
    }

    static CoverConfigDto toDto(CoverConfig c) {
        return new CoverConfigDto(c.getBaseRateBps(), c.getMinBundleValueCents(), c.getNaturalWaitingDays(), c.getAccidentalWaitingDays(),
                c.getUpgradeWaitingDays(), c.getMainMinAge(), c.getMainMaxAge(), c.getMainCoverEndAge(), c.getMaxMembers(), c.getMaxCommitmentMultiple(),
                c.getLapseAfterMissedPayments(), c.getReinstateWithinDays(), c.getEscalationCapBps(), c.getCoolingOffDays(),
                c.getRules().stream().map(r -> new RelationshipRuleDto(r.relationship(), r.multiplierBps(), r.minAge(), r.maxAge(), r.coverEndAge(), r.maxCount())).toList(),
                c.getAgeBands().stream().map(b -> new AgeBandDto(b.fromAge(), b.toAge(), b.multiplierBps())).toList());
    }

    static BenefitItemAdminDto toDto(BenefitItem i) {
        return new BenefitItemAdminDto(i.getId(), i.getKind(), i.getName(), i.getDescription(), i.getUnitLabel(), i.getValueCents(), i.getCostCents(),
                i.getMaxQty(), i.getGroupId(), i.isActive(), i.getOnFarm(), List.copyOf(i.getContents()));
    }

    private static ApiException bad(String m) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, m); }
}
