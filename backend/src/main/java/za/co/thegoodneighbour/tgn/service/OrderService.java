package za.co.thegoodneighbour.tgn.service;

import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.repo.*;

@Service
public class OrderService {
    private final ProductRepository products;
    private final PackageDefRepository packages;
    private final DeliveryZoneRepository zones;
    private final CustomerOrderRepository orders;
    private final PricingService pricing;
    private final JsonMapper json;

    public OrderService(ProductRepository products, PackageDefRepository packages, DeliveryZoneRepository zones,
                        CustomerOrderRepository orders, PricingService pricing, JsonMapper json) {
        this.products = products; this.packages = packages; this.zones = zones; this.orders = orders;
        this.pricing = pricing; this.json = json;
    }

    /**
     * Prices the order from the catalogue (never trusting client prices), validates availability and
     * saves it as "order_received" / "awaiting_payment". Payment is confirmed later by a payment provider.
     */
    @Transactional
    public OrderDto place(AppUser user, NewOrderRequest req) {
        DeliveryZone zone = zones.findById(req.delivery().provinceCode())
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "We can't deliver to that province yet."));

        List<BasketPackageIn> pkgIn = req.basket().packages() == null ? List.of() : req.basket().packages();
        Map<String, BasketPackageIn> pkgByInstance = new HashMap<>();
        List<PricedPackageDto> pricedPackages = new ArrayList<>();
        for (BasketPackageIn p : pkgIn) {
            PackageDef def = packages.findById(p.packageId())
                    .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "One of the packages in your basket is no longer available."));
            pkgByInstance.put(p.instanceId(), p);
            pricedPackages.add(new PricedPackageDto(p.instanceId(), def.getId(), def.getName(), def.getDiscountBps(), p.instructions(), 0, 0));
        }

        List<PricedLineDto> lines = new ArrayList<>();
        for (BasketLineIn l : req.basket().lines()) {
            Product product = products.findById(l.productId())
                    .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "An item in your basket is no longer available."));
            if (!Availability.purchasable(product.getAvailability()))
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, product.getName() + " can't be ordered right now.");
            if (product.getStock() != null && l.quantity() > product.getStock())
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "We don't have " + l.quantity() + " of " + product.getName() + " available.");
            if (l.packageInstanceId() != null && !pkgByInstance.containsKey(l.packageInstanceId()))
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Your basket is out of date. Please review it and try again.");

            Product.Variant variant = null;
            if (!product.getVariants().isEmpty()) {
                String vid = l.variantId() != null ? l.variantId() : (product.getVariants().size() == 1 ? product.getVariants().get(0).id() : null);
                variant = product.variant(vid).orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Please choose a size for " + product.getName() + "."));
                if (variant.availability() != null && !Availability.purchasable(variant.availability()))
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, product.getName() + " (" + variant.label() + ") can't be ordered right now.");
            }

            List<ServiceOptionLine> options = new ArrayList<>();
            for (OptionRef ref : l.serviceOptions() == null ? List.<OptionRef>of() : l.serviceOptions()) {
                Product.ServiceOption o = product.serviceOption(ref.id())
                        .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That service isn't offered for " + product.getName() + "."));
                options.add(new ServiceOptionLine(o.id(), o.name(), o.priceCents()));
            }
            options.sort(Comparator.comparing(ServiceOptionLine::id));

            long unit = variant != null ? variant.priceCents() : product.getPriceCents();
            String variantId = variant != null ? variant.id() : null;
            String key = String.join("|", product.getId(), variantId == null ? "-" : variantId,
                    options.isEmpty() ? "-" : String.join("+", options.stream().map(ServiceOptionLine::id).toList()),
                    l.packageInstanceId() == null ? "-" : l.packageInstanceId());
            lines.add(new PricedLineDto(key, product.getId(), product.getName(), product.getKind(), product.getCategoryId(),
                    variantId, variant == null ? null : variant.label(), product.getUnitLabel(), unit, options, l.quantity(),
                    l.packageInstanceId(), pricing.unitTotal(unit, options) * l.quantity()));
        }

        PricingService.Result priced = pricing.price(lines, pricedPackages, zone.getFeeCents());
        TotalsDto t = priced.totals();
        DeliveryIn d = req.delivery();
        CustomerOrder order = new CustomerOrder(user.getId(), user.getFullName(), user.getPhone(),
                write(priced.lines()), write(priced.packages()), t.itemsCents(), t.packageSavingCents(), t.subtotalCents(),
                t.deliveryCents(), t.totalCents(), req.basket().notes(),
                new CustomerOrder.Delivery(d.recipientName().trim(), d.recipientPhone(), d.addressLine().trim(), d.suburb().trim(),
                        d.city().trim(), zone.getProvinceCode(), zone.getProvince(), d.postalCode(), d.date(), d.window(), d.instructions()));
        return toDto(orders.save(order));
    }

    @Transactional(readOnly = true)
    public List<OrderDto> list(AppUser user) {
        return orders.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public OrderDto get(AppUser user, String id) {
        return orders.findByIdAndUserId(id, user.getId()).map(this::toDto)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that order."));
    }

    private OrderDto toDto(CustomerOrder o) {
        CustomerOrder.Delivery d = o.getDelivery();
        return new OrderDto(o.getId(), o.getReference(), DateTimeFormatter.ISO_INSTANT.format(o.getCreatedAt().atOffset(ZoneOffset.UTC)),
                o.getStatus(), o.getPaymentStatus(),
                read(o.getLinesJson(), new TypeReference<List<PricedLineDto>>() {}),
                read(o.getPackagesJson(), new TypeReference<List<PricedPackageDto>>() {}),
                new TotalsDto(o.getItemsCents(), o.getPackageSavingCents(), o.getSubtotalCents(), o.getDeliveryCents(), o.getTotalCents()),
                new DeliveryDto(d.recipientName(), d.recipientPhone(), d.addressLine(), d.suburb(), d.city(), d.provinceCode(),
                        d.province(), d.postalCode(), d.date(), d.window(), d.instructions()),
                new PlacedByDto(o.getPlacedByName(), o.getPlacedByPhone()), o.getNotes());
    }

    private String write(Object value) {
        return json.writeValueAsString(value);
    }

    private <T> T read(String text, TypeReference<T> type) {
        return json.readValue(text, type);
    }
}
