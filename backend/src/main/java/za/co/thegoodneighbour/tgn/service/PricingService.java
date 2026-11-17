package za.co.thegoodneighbour.tgn.service;

import java.util.List;
import org.springframework.stereotype.Service;
import za.co.thegoodneighbour.tgn.api.Dtos.*;

/**
 * Pure order pricing. Mirrors mobile/src/lib/pricing.ts: a package saving applies to the lines of
 * that package as they stand (including customer edits). Money is integer cents; rounding is half-up.
 */
@Service
public class PricingService {

    public record Result(List<PricedLineDto> lines, List<PricedPackageDto> packages, TotalsDto totals) {}

    public long unitTotal(long unitPriceCents, List<ServiceOptionLine> options) {
        return unitPriceCents + options.stream().mapToLong(ServiceOptionLine::priceCents).sum();
    }

    public long saving(long subtotalCents, int discountBps) {
        return Math.round(subtotalCents * discountBps / 10000.0);
    }

    /** @param deliveryCents null when the delivery fee isn't known yet. */
    public Result price(List<PricedLineDto> lines, List<PricedPackageDto> packages, Long deliveryCents) {
        List<PricedPackageDto> pricedPackages = packages.stream().map(p -> {
            long subtotal = lines.stream().filter(l -> p.instanceId().equals(l.packageInstanceId()))
                    .mapToLong(PricedLineDto::lineTotalCents).sum();
            return new PricedPackageDto(p.instanceId(), p.packageId(), p.name(), p.discountBps(), p.instructions(),
                    subtotal, saving(subtotal, p.discountBps()));
        }).toList();
        long items = lines.stream().mapToLong(PricedLineDto::lineTotalCents).sum();
        long savings = pricedPackages.stream().mapToLong(PricedPackageDto::savingCents).sum();
        long subtotal = items - savings;
        return new Result(lines, pricedPackages,
                new TotalsDto(items, savings, subtotal, deliveryCents, deliveryCents == null ? null : subtotal + deliveryCents));
    }
}
