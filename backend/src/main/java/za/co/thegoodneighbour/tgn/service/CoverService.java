package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.BenefitItem;
import za.co.thegoodneighbour.tgn.domain.CoverConfig;
import za.co.thegoodneighbour.tgn.domain.Policy;
import za.co.thegoodneighbour.tgn.repo.BenefitItemRepository;
import za.co.thegoodneighbour.tgn.repo.CoverConfigRepository;
import za.co.thegoodneighbour.tgn.repo.PolicyRepository;

/** The cover catalogue and the pricing engine, plus the herd capacity guard. */
@Service
public class CoverService {
    static final List<Integer> DEBIT_DAYS = List.of(1, 7, 15, 25);
    private static final List<String> OPEN = List.of("pending_review", "approved", "active");

    private final CoverConfigRepository configs;
    private final BenefitItemRepository items;
    private final PolicyRepository policies;
    private final JsonMapper json;
    private final Clock clock;

    public CoverService(CoverConfigRepository configs, BenefitItemRepository items, PolicyRepository policies, JsonMapper json, Clock clock) {
        this.configs = configs; this.items = items; this.policies = policies; this.json = json; this.clock = clock;
    }

    public CoverConfig config() {
        return configs.findById(CoverConfig.ID).orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Cover isn't available yet. Please check back soon."));
    }

    // ---------------- public options ----------------

    @Transactional(readOnly = true)
    public CoverOptionsDto options() {
        CoverConfig cfg = config();
        Map<String, Long> promised = promisedByItem(null);
        List<BenefitItemDto> list = items.findAll(Sort.by("sortOrder")).stream().filter(BenefitItem::isActive).map(i -> new BenefitItemDto(
                i.getId(), i.getKind(), i.getName(), i.getDescription(), i.getUnitLabel(), i.getValueCents(),
                CoverRules.baseMonthly(i.getCostCents(), cfg.getBaseRateBps()), i.getMaxQty(), i.getGroupId(), List.copyOf(i.getContents()),
                hasRoom(i, cfg, promised.getOrDefault(i.getId(), 0L), 1))).toList();
        return new CoverOptionsDto(list,
                cfg.getRules().stream().map(r -> new RelationshipRuleDto(r.relationship(), r.multiplierBps(), r.minAge(), r.maxAge(), r.coverEndAge(), r.maxCount())).toList(),
                cfg.getAgeBands().stream().map(b -> new AgeBandDto(b.fromAge(), b.toAge(), b.multiplierBps())).toList(),
                cfg.getMinBundleValueCents(), cfg.getMainMinAge(), cfg.getMainMaxAge(), cfg.getMaxMembers(), cfg.getNaturalWaitingDays(),
                cfg.getAccidentalWaitingDays(), cfg.getUpgradeWaitingDays(), cfg.getLapseAfterMissedPayments(), cfg.getReinstateWithinDays(),
                cfg.getEscalationCapBps() / 100, DEBIT_DAYS, cfg.getCoolingOffDays());
    }

    // ---------------- quote ----------------

    /** Prices a bundle and family and reports every problem. Never throws for rule problems. */
    @Transactional(readOnly = true)
    public QuoteDto quote(List<BundleLineIn> lines, List<QuoteMemberIn> members, LocalDate holderDob, String excludePolicyId, boolean coverMain) {
        CoverConfig cfg = config();
        LocalDate today = LocalDate.now(clock);
        List<String> problems = new ArrayList<>();
        Map<String, Integer> qty = new LinkedHashMap<>();
        for (BundleLineIn l : lines) if (l.quantity() > 0) qty.merge(l.itemId(), l.quantity(), Integer::sum);
        Map<String, Long> promised = promisedByItem(excludePolicyId);

        List<BundleLineDto> out = new ArrayList<>();
        Set<String> groupsUsed = new HashSet<>();
        long value = 0, cost = 0;
        for (var e : qty.entrySet()) {
            BenefitItem item = items.findById(e.getKey()).filter(BenefitItem::isActive).orElse(null);
            if (item == null) { problems.add("One of the options you chose isn't available any more."); continue; }
            int q = e.getValue();
            if (q > item.getMaxQty()) problems.add(item.getName() + " allows up to " + item.getMaxQty() + ".");
            if (item.getGroupId() != null && !groupsUsed.add(item.getGroupId())) problems.add("Please choose only one grocery hamper.");
            if (!hasRoom(item, cfg, promised.getOrDefault(item.getId(), 0L), q))
                problems.add(item.getName() + " is temporarily unavailable. Please choose a different option or call us.");
            out.add(new BundleLineDto(item.getId(), item.getKind(), item.getName(), q, item.getValueCents() * q,
                    CoverRules.baseMonthly(item.getCostCents() * q, cfg.getBaseRateBps()), List.copyOf(item.getContents())));
            value += item.getValueCents() * q;
            cost += item.getCostCents() * q;
        }
        if (value < cfg.getMinBundleValueCents())
            problems.add("Your cover needs to be worth at least " + CoverRules.rand(cfg.getMinBundleValueCents()) + ". Add a grocery hamper or livestock.");

        long base = CoverRules.baseMonthly(cost, cfg.getBaseRateBps());
        // Until someone's age is known, price them as a typical adult (age 30) so the customer sees a sensible estimate.
        int typical = cfg.ageMultiplierBps(30);

        Integer holderAge = holderDob == null ? null : CoverRules.age(holderDob, today);
        if (coverMain && holderAge != null && (holderAge < cfg.getMainMinAge() || holderAge > cfg.getMainMaxAge()))
            problems.add("This cover is for people aged " + cfg.getMainMinAge() + " to " + cfg.getMainMaxAge() + ".");
        // An owner who only pays isn't a covered person, so no age limit or price applies to them, but they must be an adult.
        if (!coverMain && holderAge != null && holderAge < 18) problems.add("You need to be 18 or older to own a plan.");
        if (!coverMain && (members == null || members.isEmpty())) problems.add("Add at least one person to cover.");
        int mainAgeBps = coverMain ? (holderAge == null ? typical : cfg.ageMultiplierBps(holderAge)) : 10000;
        PersonQuoteDto main = new PersonQuoteDto("you", holderAge, 10000, mainAgeBps, coverMain ? CoverRules.personFee(base, 10000, mainAgeBps) : 0);

        List<PersonQuoteDto> people = new ArrayList<>();
        Map<String, Long> counts = new HashMap<>();
        long total = main.feeCents();
        List<QuoteMemberIn> ms = members == null ? List.of() : members;
        for (int i = 0; i < ms.size(); i++) {
            QuoteMemberIn m = ms.get(i);
            LocalDate dob = null;
            if (m.dateOfBirth() != null) { try { dob = LocalDate.parse(m.dateOfBirth()); } catch (java.time.DateTimeException ex) { problems.add("That date of birth doesn't look right."); } }
            long existing = counts.getOrDefault(m.relationship(), 0L);
            CoverRules.memberProblem(cfg, m.relationship(), dob, existing, i, today).ifPresent(problems::add);
            counts.merge(m.relationship(), 1L, Long::sum);
            Integer age = dob == null ? null : CoverRules.age(dob, today);
            int relBps = cfg.rule(m.relationship()).map(CoverConfig.RelationshipRule::multiplierBps).orElse(0);
            int ageBps = age == null ? typical : cfg.ageMultiplierBps(age);
            PersonQuoteDto person = new PersonQuoteDto(m.relationship(), age, relBps, ageBps, CoverRules.personFee(base, relBps, ageBps));
            people.add(person);
            total += person.feeCents();
        }
        List<String> distinct = problems.stream().distinct().toList();
        return new QuoteDto(distinct.isEmpty(), distinct, out, value, base, main, people, total, coverMain);
    }

    // ---------------- herd capacity ----------------

    static boolean hasRoom(BenefitItem item, CoverConfig cfg, long promised, int extra) {
        return item.getOnFarm() == null || promised + extra <= (long) item.getOnFarm() * cfg.getMaxCommitmentMultiple();
    }

    /** Units promised per item across open policies' current bundles. */
    @Transactional(readOnly = true)
    public Map<String, Long> promisedByItem(String excludePolicyId) {
        Map<String, Long> out = new HashMap<>();
        for (Policy p : policies.findAll()) {
            if (!OPEN.contains(p.getStatus()) || p.getId().equals(excludePolicyId)) continue;
            BundleVersionDto cur = current(p);
            if (cur != null) cur.lines().forEach(l -> out.merge(l.itemId(), (long) l.quantity(), Long::sum));
        }
        return out;
    }

    /** What a bundle costs us to supply (the catalogue's cost per unit times the quantity). Never shown to customers. */
    @Transactional(readOnly = true)
    public long bundleCostCents(BundleVersionDto v) {
        long cost = 0;
        for (BundleLineDto l : v.lines()) cost += items.findById(l.itemId()).map(BenefitItem::getCostCents).orElse(0L) * l.quantity();
        return cost;
    }

    // ---------------- bundle versions ----------------

    public List<BundleVersionDto> versions(Policy p) {
        if (p.getBundleVersionsJson() == null) return List.of();
        return json.readValue(p.getBundleVersionsJson(), new TypeReference<List<BundleVersionDto>>() {});
    }

    public BundleVersionDto current(Policy p) {
        List<BundleVersionDto> v = versions(p);
        return v.isEmpty() ? null : v.get(v.size() - 1);
    }

    public String write(List<BundleVersionDto> versions) { return json.writeValueAsString(versions); }
    public String writeOne(BundleVersionDto v) { return json.writeValueAsString(v); }
    public BundleVersionDto readOne(String text) { return text == null ? null : json.readValue(text, BundleVersionDto.class); }

    /**
     * The bundle the family is owed for a death on `died`. An upgrade only counts once its waiting period
     * has passed (for natural causes); until then the previous bundle applies. Accidental deaths use the latest.
     */
    public BundleVersionDto applicable(Policy p, LocalDate died, String cause) {
        List<BundleVersionDto> v = versions(p);
        for (int i = v.size() - 1; i >= 0; i--) {
            BundleVersionDto b = v.get(i);
            boolean started = b.effectiveFrom() == null || !died.isBefore(LocalDate.parse(b.effectiveFrom()));
            boolean waited = "accidental".equals(cause) || b.upgradeWaitingEndsOn() == null || !died.isBefore(LocalDate.parse(b.upgradeWaitingEndsOn()));
            if (started && waited) return b;
        }
        return v.isEmpty() ? null : v.get(0);
    }

    static ApiException unprocessable(String m) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, m); }
}
