package za.co.thegoodneighbour.tgn.service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.WishDto;
import za.co.thegoodneighbour.tgn.api.Dtos.WishIn;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.Claim;
import za.co.thegoodneighbour.tgn.domain.FuneralWish;
import za.co.thegoodneighbour.tgn.domain.Policy;
import za.co.thegoodneighbour.tgn.domain.PolicyMember;
import za.co.thegoodneighbour.tgn.repo.FuneralWishRepository;
import za.co.thegoodneighbour.tgn.repo.PolicyRepository;

/**
 * Funeral wishes: what each covered person would like. The plan's owner records them. The family on the plan can read them (without the
 * "who to call" phone number), and our team sees them when a claim is made, so nobody has to ask at the worst moment.
 */
@Service
public class WishService {
    private final FuneralWishRepository wishes;
    private final PolicyRepository policies;
    private final AuditService audit;

    public WishService(FuneralWishRepository wishes, PolicyRepository policies, AuditService audit) { this.wishes = wishes; this.policies = policies; this.audit = audit; }

    @Transactional(readOnly = true)
    public List<WishDto> list(AppUser owner, String policyId) { return forPolicy(owned(owner, policyId), true); }

    @Transactional
    public WishDto save(AppUser owner, String policyId, String memberKey, WishIn in) {
        Policy p = owned(owner, policyId);
        Person who = people(p).stream().filter(x -> x.key.equals(memberKey)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that person on your plan."));
        FuneralWish w = wishes.findByPolicyIdAndMemberKey(policyId, memberKey).orElseGet(() -> new FuneralWish(policyId, memberKey));
        w.update(in.disposition(), clean(in.place()), clean(in.denomination()), clean(in.music()), clean(in.notes()), clean(in.contactName()), in.contactPhone() == null || in.contactPhone().isBlank() ? null : in.contactPhone(), owner.getId());
        wishes.save(w);
        audit.record("customer", "wishes.updated", "policy", policyId, "wishes recorded for " + who.name);
        return toDto(who, w, true);
    }

    /** Everyone covered on the plan (living or passed away), with their wishes if recorded. */
    @Transactional(readOnly = true)
    public List<WishDto> forPolicy(Policy p, boolean includeContact) {
        Map<String, FuneralWish> byKey = wishes.findByPolicyId(p.getId()).stream().collect(Collectors.toMap(FuneralWish::getMemberKey, w -> w, (a, b) -> a));
        List<WishDto> out = new ArrayList<>();
        for (Person who : people(p)) out.add(toDto(who, byKey.get(who.key), includeContact));
        return out;
    }

    /** What our team sees on a claim: the wishes of the person who passed away. */
    @Transactional(readOnly = true)
    public WishDto forClaim(Claim c) {
        Policy p = policies.findById(c.getPolicyId()).orElse(null);
        if (p == null) return null;
        String key = c.getMemberId() == null ? "main" : c.getMemberId();
        return people(p).stream().filter(x -> x.key.equals(key)).findFirst()
                .map(who -> toDto(who, wishes.findByPolicyIdAndMemberKey(p.getId(), key).orElse(null), true)).orElse(null);
    }

    private record Person(String key, String name, String relationship) {}

    private List<Person> people(Policy p) {
        List<Person> out = new ArrayList<>();
        if (p.coversHolder() || p.getHolderDiedOn() != null) out.add(new Person("main", p.getHolderName(), "main"));
        for (PolicyMember m : p.getMembers()) if ("active".equals(m.getStatus()) || "deceased".equals(m.getStatus())) out.add(new Person(m.getId(), m.getFullName(), m.getRelationship()));
        return out;
    }

    private static WishDto toDto(Person who, FuneralWish w, boolean includeContact) {
        if (w == null) return new WishDto(who.key, who.name, who.relationship, false, null, null, null, null, null, null, null, null);
        return new WishDto(who.key, who.name, who.relationship, true, w.getDisposition(), w.getPlace(), w.getDenomination(), w.getMusic(), w.getNotes(), w.getContactName(),
                includeContact ? w.getContactPhone() : null, DateTimeFormatter.ISO_INSTANT.format(w.getUpdatedAt().atOffset(ZoneOffset.UTC)));
    }

    private static String clean(String s) {
        if (s == null) return null;
        String t = s.replaceAll("[\\p{Cntrl}&&[^\\n]]", "").trim();
        return t.isEmpty() ? null : t;
    }

    private Policy owned(AppUser u, String id) {
        return policies.findByIdAndUserId(id, u.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that cover."));
    }
}
