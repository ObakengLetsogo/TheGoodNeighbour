package za.co.thegoodneighbour.tgn.service;

import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.domain.*;
import za.co.thegoodneighbour.tgn.repo.*;

@Service
@Transactional(readOnly = true)
public class CatalogService {
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final PackageDefRepository packages;
    private final DeliveryZoneRepository zones;

    public CatalogService(CategoryRepository c, ProductRepository p, PackageDefRepository pk, DeliveryZoneRepository z) {
        this.categories = c; this.products = p; this.packages = pk; this.zones = z;
    }

    public CatalogDto catalog() {
        return new CatalogDto(
                categories.findAll(Sort.by("sortOrder")).stream().map(CatalogService::toDto).toList(),
                products.findAll(Sort.by("sortOrder")).stream().map(CatalogService::toDto).toList(),
                packages.findAll(Sort.by("sortOrder")).stream().map(CatalogService::toDto).toList(),
                zones.findAll().stream().sorted(Comparator.comparingLong(DeliveryZone::getFeeCents)).map(CatalogService::toDto).toList());
    }

    static CategoryDto toDto(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getGroup(), c.getAccent(), c.getIcon(), c.getBlurb());
    }

    static ProductDto toDto(Product p) {
        List<VariantDto> variants = p.getVariants().stream().map(v -> new VariantDto(v.id(), v.label(), v.priceCents(), v.availability())).toList();
        List<ServiceOptionDto> options = p.getServiceOptions().stream().map(o -> new ServiceOptionDto(o.id(), o.name(), o.description(), o.priceCents())).toList();
        return new ProductDto(p.getId(), p.getCategoryId(), p.getKind(), p.getName(), p.getDescription(), p.getUnitLabel(),
                p.getPriceCents(), variants.isEmpty() ? null : variants, options.isEmpty() ? null : options, p.getAvailability(),
                p.getStock(), p.getImageUrl(), p.getIncludes().isEmpty() ? null : List.copyOf(p.getIncludes()), p.getDeliveryInfo(),
                p.getTags().isEmpty() ? null : List.copyOf(p.getTags()), p.getSupplierId());
    }

    static PackageDto toDto(PackageDef p) {
        return new PackageDto(p.getId(), p.getName(), p.getDescription(), p.getAccommodates(), p.getAccent(),
                List.copyOf(p.getOccasions()),
                p.getLines().stream().map(l -> new PackageLineDto(l.productId(), l.variantId(), l.quantity(), l.optional())).toList(),
                p.getDiscountBps(), p.getImageUrl());
    }

    static DeliveryZoneDto toDto(DeliveryZone z) {
        return new DeliveryZoneDto(z.getProvince(), z.getProvinceCode(), z.getFeeCents(), z.getNote());
    }
}
