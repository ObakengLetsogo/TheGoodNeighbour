package za.co.thegoodneighbour.tgn.service;

import java.time.LocalDate;
import java.time.Period;
import java.util.Collection;
import org.springframework.http.HttpStatus;
import za.co.thegoodneighbour.tgn.domain.Plan;
import za.co.thegoodneighbour.tgn.domain.PolicyMember;

/** Pure plan pricing and eligibility rules. The server is authoritative; clients only preview. */
public final class PlanRules {
    private PlanRules() {}

    public static int age(LocalDate dob, LocalDate asOf) {
        return Period.between(dob, asOf).getYears();
    }

    public static long monthlyTotal(Plan plan, Collection<PolicyMember> activeMembers) {
        return plan.getPremiumCents() + activeMembers.stream().mapToLong(PolicyMember::getFeeCents).sum();
    }

    /** Throws a friendly 422 if the person can't be added to the plan under its rules. */
    public static Plan.MemberRule checkMember(Plan plan, String type, LocalDate dob, long existingOfType, LocalDate today) {
        Plan.MemberRule rule = plan.rule(type).orElseThrow(() -> reject("This plan doesn't include " + label(type) + " members."));
        if (dob.isAfter(today)) throw reject("That date of birth is in the future.");
        int age = age(dob, today);
        if (age < rule.minAge() || age > rule.maxAge())
            throw reject("A " + label(type) + " must be between " + rule.minAge() + " and " + rule.maxAge() + " years old on this plan.");
        if (existingOfType >= rule.maxCount())
            throw reject("This plan allows up to " + rule.maxCount() + " " + label(type) + (rule.maxCount() == 1 ? "" : " members") + ".");
        return rule;
    }

    public static String label(String type) {
        return switch (type) {
            case "spouse" -> "spouse";
            case "child" -> "child";
            case "parent" -> "parent";
            default -> "extended family";
        };
    }

    static ApiException reject(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
