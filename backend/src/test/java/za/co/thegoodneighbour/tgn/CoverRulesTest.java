package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import za.co.thegoodneighbour.tgn.domain.CoverConfig;
import za.co.thegoodneighbour.tgn.domain.CoverConfig.RelationshipRule;
import za.co.thegoodneighbour.tgn.service.CoverRules;

class CoverRulesTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);
    private final CoverConfig cfg = new CoverConfig(160, 250_000, 180, 0, 180, 18, 65, 85, 3, 25, 2, 90, 1000, 31, List.of(
            new RelationshipRule("spouse", 10000, 18, 65, 85, 1), new RelationshipRule("child", 4000, 0, 21, 24, 2)));

    @Test void premiumIsBundleCostTimesRateAndRoundsHalfUp() {
        assertEquals(8_480, CoverRules.baseMonthly(530_000, 160));   // R5 300 at 1.6% = R84.80
        assertEquals(0, CoverRules.baseMonthly(31, 160));            // 0.496 rounds down
        assertEquals(1, CoverRules.baseMonthly(32, 160));            // 0.512 rounds up
    }

    @Test void memberFeeIsAPercentageOfTheMainPremium() {
        assertEquals(8_480, CoverRules.memberFee(8_480, 10000));
        assertEquals(3_392, CoverRules.memberFee(8_480, 4000));
        assertEquals(0, CoverRules.memberFee(0, 4000));
    }

    @Test void enforcesRelationshipsAgesAndCounts() {
        assertTrue(CoverRules.memberProblem(cfg, "child", LocalDate.of(2015, 3, 10), 0, 0, TODAY).isEmpty());
        assertTrue(CoverRules.memberProblem(cfg, "child", LocalDate.of(1990, 1, 1), 0, 0, TODAY).isPresent());   // too old to join
        assertTrue(CoverRules.memberProblem(cfg, "spouse", LocalDate.of(1990, 1, 1), 1, 1, TODAY).isPresent()); // only one spouse
        assertTrue(CoverRules.memberProblem(cfg, "sibling", LocalDate.of(1990, 1, 1), 0, 0, TODAY).isPresent()); // not on this config
        assertTrue(CoverRules.memberProblem(cfg, "child", LocalDate.of(2015, 3, 10), 0, 3, TODAY).isPresent()); // 3 members max
        assertTrue(CoverRules.memberProblem(cfg, "child", TODAY.plusDays(1), 0, 0, TODAY).isPresent());
        assertTrue(CoverRules.memberProblem(cfg, "child", null, 0, 0, TODAY).isEmpty());                         // quote before the date is known
    }

    @Test void coverEndsAtTheConfiguredAge() {
        assertFalse(CoverRules.overAgeLimit(cfg, "child", 24));
        assertTrue(CoverRules.overAgeLimit(cfg, "child", 25));
        assertFalse(CoverRules.overAgeLimit(cfg, null, 85));
        assertTrue(CoverRules.overAgeLimit(cfg, null, 86));
    }

    @Test void formatsRandWithNonBreakingSpaces() {
        assertEquals("R2 500", CoverRules.rand(250_000));
        assertEquals("R84.80", CoverRules.rand(8_480));
    }

    @Test void reinstatementWindowAndCoolingOffAreCountedInDays() {
        LocalDate lapsed = LocalDate.of(2026, 9, 1);
        assertEquals(LocalDate.of(2026, 11, 30), CoverRules.reinstateUntil(lapsed, 90));
        assertTrue(CoverRules.canReinstate(lapsed, 90, LocalDate.of(2026, 11, 30)));   // the last day still counts
        assertFalse(CoverRules.canReinstate(lapsed, 90, LocalDate.of(2026, 12, 1)));
        assertTrue(CoverRules.withinCoolingOff(LocalDate.of(2026, 11, 1), 31, LocalDate.of(2026, 12, 2)));
        assertFalse(CoverRules.withinCoolingOff(LocalDate.of(2026, 11, 1), 31, LocalDate.of(2026, 12, 3)));
        assertFalse(CoverRules.withinCoolingOff(null, 31, LocalDate.of(2026, 11, 1)));  // not started: nothing to cool off from
    }
}
