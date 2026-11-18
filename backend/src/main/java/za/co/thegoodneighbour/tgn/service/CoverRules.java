package za.co.thegoodneighbour.tgn.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.time.Period;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import za.co.thegoodneighbour.tgn.domain.CoverConfig;

/** Pure pricing and eligibility rules. The server is authoritative; clients only preview via the quote endpoint. */
public final class CoverRules {
    private CoverRules() {}

    public static int age(LocalDate dob, LocalDate asOf) { return Period.between(dob, asOf).getYears(); }

    /** Monthly premium for the main member: the bundle's cost to the company times the base rate. Half-up rounding. */
    public static long baseMonthly(long bundleCostCents, int baseRateBps) { return Math.round(bundleCostCents * baseRateBps / 10000.0); }

    /** A family member's monthly fee is the main member's premium times their relationship multiplier. */
    public static long memberFee(long baseMonthlyCents, int multiplierBps) { return Math.round(baseMonthlyCents * multiplierBps / 10000.0); }

    /**
     * Anyone's monthly price: the reference base price, scaled by their relationship factor and by the factor for their
     * current age. Rounded once, half-up, so the parts always add up to the total.
     */
    public static long personFee(long baseMonthlyCents, int relationshipBps, int ageBps) {
        return Math.round(baseMonthlyCents * (double) relationshipBps * ageBps / 100_000_000.0);
    }

    public static String label(String relationship) {
        return switch (relationship) {
            case "spouse" -> "spouse";
            case "child" -> "child";
            case "parent" -> "parent";
            case "parent_in_law" -> "parent-in-law";
            case "grandparent" -> "grandparent";
            case "sibling" -> "sibling";
            default -> "other family member";
        };
    }

    /** Returns a friendly problem for adding this person, or empty when allowed. dob may be null (age checks skipped). */
    public static Optional<String> memberProblem(CoverConfig cfg, String relationship, LocalDate dob, long existingOfRelationship,
                                                 long existingTotal, LocalDate today) {
        var rule = cfg.rule(relationship);
        if (rule.isEmpty()) return Optional.of("We can't add a " + label(relationship) + " to a cover.");
        if (existingTotal >= cfg.getMaxMembers()) return Optional.of("A cover can have up to " + cfg.getMaxMembers() + " family members.");
        if (existingOfRelationship >= rule.get().maxCount())
            return Optional.of("A cover can include up to " + rule.get().maxCount() + " " + label(relationship) + (rule.get().maxCount() == 1 ? "" : "s") + ".");
        if (dob != null) {
            if (dob.isAfter(today)) return Optional.of("That date of birth is in the future.");
            int age = age(dob, today);
            if (age < rule.get().minAge() || age > rule.get().maxAge())
                return Optional.of("A " + label(relationship) + " must be between " + rule.get().minAge() + " and " + rule.get().maxAge() + " years old to join.");
        }
        return Optional.empty();
    }

    /** Whether someone aged `ageAtDeath` is beyond the age their cover ends. */
    public static boolean overAgeLimit(CoverConfig cfg, String relationshipOrNullForMain, int ageAtDeath) {
        int end = relationshipOrNullForMain == null ? cfg.getMainCoverEndAge()
                : cfg.rule(relationshipOrNullForMain).map(CoverConfig.RelationshipRule::coverEndAge).orElse(cfg.getMainCoverEndAge());
        return ageAtDeath > end;
    }

    /** The last day a lapsed cover can be reinstated without applying again. */
    public static LocalDate reinstateUntil(LocalDate lapsedOn, int reinstateWithinDays) { return lapsedOn.plusDays(reinstateWithinDays); }

    public static boolean canReinstate(LocalDate lapsedOn, int reinstateWithinDays, LocalDate today) { return !today.isAfter(reinstateUntil(lapsedOn, reinstateWithinDays)); }

    /** True while a cancellation is inside the cooling-off period that follows the start of cover. */
    public static boolean withinCoolingOff(LocalDate coverStarted, int coolingOffDays, LocalDate today) {
        return coverStarted != null && !today.isAfter(coverStarted.plusDays(coolingOffDays));
    }

    /**
     * The debit dates that have already passed for a cover: the first debit day after cover started, then every month,
     * stopping before today (a debit due today isn't late yet). The first payment, taken when cover started, is not in this list.
     */
    public static List<LocalDate> dueDates(LocalDate coverStarted, int debitDay, LocalDate today) {
        List<LocalDate> out = new ArrayList<>();
        LocalDate month = coverStarted.withDayOfMonth(1);
        while (true) {
            LocalDate due = month.withDayOfMonth(Math.min(debitDay, month.lengthOfMonth()));
            if (!due.isBefore(today)) break;
            if (due.isAfter(coverStarted)) out.add(due);
            month = month.plusMonths(1);
        }
        return out;
    }

    /** Payments owed so far (the first one plus one per passed debit date) less payments actually received. Never negative. */
    public static int missedPayments(List<LocalDate> dueDates, long paymentsReceived) {
        return (int) Math.max(0, 1 + dueDates.size() - paymentsReceived);
    }

    /** The oldest debit date that is still unpaid, assuming payments were made in order. Null when nothing is missed. */
    public static LocalDate oldestUnpaid(List<LocalDate> dueDates, int missed) {
        if (missed <= 0 || dueDates.isEmpty()) return null;
        return dueDates.get(Math.max(0, dueDates.size() - missed));
    }

    /** "2027-05-17" -> "17 May 2027", for messages people read. */
    public static String friendlyDate(String iso) {
        return LocalDate.parse(iso).format(java.time.format.DateTimeFormatter.ofPattern("d MMMM yyyy", java.util.Locale.ENGLISH));
    }

    static ApiException reject(String message) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, message); }

    /** "R2 500" with a non-breaking space for thousands. */
    public static String rand(long cents) {
        String s = String.valueOf(cents / 100);
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) { if (i > 0 && (s.length() - i) % 3 == 0) b.append(' '); b.append(s.charAt(i)); }
        return "R" + b + (cents % 100 == 0 ? "" : String.format(".%02d", cents % 100));
    }
}
