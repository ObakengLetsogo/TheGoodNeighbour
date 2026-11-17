package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.service.PricingService;

class PricingServiceTest {
    private final PricingService pricing = new PricingService();

    private static PricedLineDto line(String id, long unit, int qty, String pkg) {
        return new PricedLineDto(id, id, id, "grocery", "c", null, null, "unit", unit, List.of(), qty, pkg, unit * qty);
    }

    @Test
    void appliesPackageSavingToPackageLinesOnly() {
        var lines = List.of(line("a", 100_000, 2, "p1"), line("b", 50_000, 1, null));
        var pkgs = List.of(new PricedPackageDto("p1", "pkg", "Pkg", 500, null, 0, 0));
        var r = pricing.price(lines, pkgs, 25_000L);
        assertEquals(250_000, r.totals().itemsCents());
        assertEquals(10_000, r.totals().packageSavingCents()); // 5% of R2 000
        assertEquals(240_000, r.totals().subtotalCents());
        assertEquals(265_000, r.totals().totalCents());
    }

    @Test
    void totalIsUnknownUntilDeliveryIsKnown() {
        var r = pricing.price(List.of(line("a", 10_000, 1, null)), List.of(), null);
        assertNull(r.totals().deliveryCents());
        assertNull(r.totals().totalCents());
        assertEquals(10_000, r.totals().subtotalCents());
    }

    @Test
    void serviceOptionsAddToTheUnitPrice() {
        assertEquals(365_000, pricing.unitTotal(320_000, List.of(new ServiceOptionLine("prep", "Prep", 45_000))));
    }
}
