package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import za.co.thegoodneighbour.tgn.domain.Plan;
import za.co.thegoodneighbour.tgn.domain.PolicyMember;
import za.co.thegoodneighbour.tgn.service.ApiException;
import za.co.thegoodneighbour.tgn.service.PlanRules;

class PlanRulesTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);
    private final Plan plan = new Plan("p", "P", "d", 3_000_000, 17_900, 6, 18, 65, "olive", true, 0, List.of(
            new Plan.MemberRule("spouse", 9_000, 3_000_000, 1, 18, 65), new Plan.MemberRule("child", 3_500, 1_500_000, 2, 0, 21)));

    private static PolicyMember member(long fee) { return new PolicyMember("child", "A", null, "2015-03-10", fee, 0, "2026-01-01", null); }

    @Test void monthlyTotalIsPremiumPlusMemberFees() {
        assertEquals(17_900 + 9_000 + 3_500, PlanRules.monthlyTotal(plan, List.of(member(9_000), member(3_500))));
    }

    @Test void ageIsCalculatedOnTheBirthday() {
        assertEquals(10, PlanRules.age(LocalDate.of(2016, 11, 17), TODAY));
        assertEquals(9, PlanRules.age(LocalDate.of(2016, 11, 18), TODAY));
    }

    @Test void enforcesAgeLimitsCountsAndKnownTypes() {
        assertDoesNotThrow(() -> PlanRules.checkMember(plan, "child", LocalDate.of(2015, 3, 10), 0, TODAY));
        assertThrows(ApiException.class, () -> PlanRules.checkMember(plan, "child", LocalDate.of(1990, 1, 1), 0, TODAY));  // too old
        assertThrows(ApiException.class, () -> PlanRules.checkMember(plan, "spouse", LocalDate.of(1990, 1, 1), 1, TODAY)); // max 1
        assertThrows(ApiException.class, () -> PlanRules.checkMember(plan, "parent", LocalDate.of(1950, 1, 1), 0, TODAY)); // not on plan
        assertThrows(ApiException.class, () -> PlanRules.checkMember(plan, "child", TODAY.plusDays(1), 0, TODAY));          // future
    }
}
