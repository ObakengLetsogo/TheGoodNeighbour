package za.co.thegoodneighbour.tgn.service;

import java.io.InputStream;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.config.TgnProperties;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.repo.*;

/**
 * Loads SAMPLE data (placeholder prices, stock and discounts) into an empty database so the app can
 * be exercised. Disabled in production by default; real data is managed through the admin platform.
 */
@Component
public class SampleCatalogSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(SampleCatalogSeeder.class);

    private final TgnProperties props;
    private final JsonMapper json;
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final PackageDefRepository packages;
    private final DeliveryZoneRepository zones;

    public SampleCatalogSeeder(TgnProperties props, JsonMapper json, CategoryRepository categories, ProductRepository products,
                               PackageDefRepository packages, DeliveryZoneRepository zones) {
        this.props = props; this.json = json; this.categories = categories; this.products = products;
        this.packages = packages; this.zones = zones;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!props.seedSampleCatalog() || categories.count() > 0) return;
        CatalogDto seed;
        try (InputStream in = getClass().getResourceAsStream("/seed/catalog.json")) {
            seed = json.readValue(in, CatalogDto.class);
        }
        int i = 0;
        for (CategoryDto c : seed.categories())
            categories.save(new Category(c.id(), c.name(), c.group(), c.accent(), c.icon(), c.blurb(), i++));
        i = 0;
        for (ProductDto p : seed.products()) {
            products.save(new Product(p.id(), p.categoryId(), p.kind(), p.name(), p.description(), p.unitLabel(), p.priceCents(),
                    p.availability(), p.stock(), p.imageUrl(), p.deliveryInfo(), p.supplierId(), i++,
                    orEmpty(p.variants()).stream().map(v -> new Product.Variant(v.id(), v.label(), v.priceCents(), v.availability())).toList(),
                    orEmpty(p.serviceOptions()).stream().map(o -> new Product.ServiceOption(o.id(), o.name(), o.description(), o.priceCents())).toList(),
                    p.includes(), p.tags()));
        }
        i = 0;
        for (PackageDto p : seed.packages())
            packages.save(new PackageDef(p.id(), p.name(), p.description(), p.accommodates(), p.accent(), p.discountBps(), p.imageUrl(), i++,
                    p.occasions(), p.lines().stream().map(l -> new PackageDef.Line(l.productId(), l.variantId(), l.quantity(), l.optional())).toList()));
        for (DeliveryZoneDto z : seed.deliveryZones())
            zones.save(new DeliveryZone(z.provinceCode(), z.province(), z.feeCents(), z.note()));
        log.warn("Seeded SAMPLE catalogue (placeholder prices and stock). Not for production use.");
    }

    private static <T> List<T> orEmpty(List<T> l) { return l == null ? List.of() : l; }
}
