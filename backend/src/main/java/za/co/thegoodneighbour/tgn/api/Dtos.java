package za.co.thegoodneighbour.tgn.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** Wire contracts. Field names mirror mobile/src/types so the app can consume them as-is. */
public final class Dtos {
    private Dtos() {}

    // ---------- Catalogue ----------
    public record CategoryDto(String id, String name, String group, String accent, String icon, String blurb) {}
    public record VariantDto(String id, String label, long priceCents, String availability) {}
    public record ServiceOptionDto(String id, String name, String description, long priceCents) {}
    public record ProductDto(String id, String categoryId, String kind, String name, String description, String unitLabel,
                             long priceCents, List<VariantDto> variants, List<ServiceOptionDto> serviceOptions,
                             String availability, Integer stock, String imageUrl, List<String> includes,
                             String deliveryInfo, List<String> tags, String supplierId) {}
    public record PackageLineDto(String productId, String variantId, int quantity, boolean optional) {}
    public record PackageDto(String id, String name, String description, String accommodates, String accent,
                             List<String> occasions, List<PackageLineDto> lines, int discountBps, String imageUrl) {}
    public record DeliveryZoneDto(String province, String provinceCode, long feeCents, String note) {}
    public record CatalogDto(List<CategoryDto> categories, List<ProductDto> products, List<PackageDto> packages,
                             List<DeliveryZoneDto> deliveryZones) {}

    // ---------- Auth ----------
    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 100) String fullName,
            @NotBlank @Pattern(regexp = "^\\+27[678]\\d{8}$", message = "Please use a valid South African mobile number.") String phone,
            @Email String email,
            @NotBlank @Size(min = 8, max = 100, message = "Use at least 8 characters.") String password) {}
    public record LoginRequest(@NotBlank String phone, @NotBlank String password) {}
    public record UserDto(String id, String fullName, String phone, String email) {}
    public record SessionDto(UserDto user, String token) {}
    public record ProfileRequest(@NotBlank @Size(min = 2, max = 100) String fullName, @Email String email) {}

    // ---------- Orders ----------
    public record OptionRef(@NotBlank String id) {}
    /** The client's prices are ignored: the server prices every line from the catalogue. */
    public record BasketLineIn(@NotBlank String productId, String variantId, List<OptionRef> serviceOptions,
                               @Min(1) @Max(99) int quantity, String packageInstanceId) {}
    public record BasketPackageIn(@NotBlank String instanceId, @NotBlank String packageId, String instructions) {}
    public record BasketIn(@NotEmpty @Valid List<BasketLineIn> lines, List<@Valid BasketPackageIn> packages,
                           @Size(max = 1000) String notes) {}
    public record DeliveryIn(
            @NotBlank @Size(max = 100) String recipientName,
            @NotBlank @Pattern(regexp = "^\\+27[678]\\d{8}$") String recipientPhone,
            @NotBlank @Size(max = 200) String addressLine,
            @NotBlank @Size(max = 100) String suburb,
            @NotBlank @Size(max = 100) String city,
            @NotBlank String provinceCode,
            @Pattern(regexp = "^\\d{4}$", message = "Postal codes have 4 digits.") String postalCode,
            @NotBlank @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$") String date,
            @NotBlank @Pattern(regexp = "^(morning|midday|afternoon)$") String window,
            @Size(max = 1000) String instructions) {}
    public record NewOrderRequest(@NotNull @Valid BasketIn basket, @NotNull @Valid DeliveryIn delivery) {}

    public record ServiceOptionLine(String id, String name, long priceCents) {}
    public record PricedLineDto(String key, String productId, String productName, String kind, String categoryId,
                                String variantId, String variantLabel, String unitLabel, long unitPriceCents,
                                List<ServiceOptionLine> serviceOptions, int quantity, String packageInstanceId,
                                long lineTotalCents) {}
    public record PricedPackageDto(String instanceId, String packageId, String name, int discountBps, String instructions,
                                   long subtotalCents, long savingCents) {}
    public record TotalsDto(long itemsCents, long packageSavingCents, long subtotalCents, Long deliveryCents, Long totalCents) {}
    public record DeliveryDto(String recipientName, String recipientPhone, String addressLine, String suburb, String city,
                              String provinceCode, String province, String postalCode, String date, String window,
                              String instructions) {}
    public record PlacedByDto(String name, String phone) {}
    public record OrderDto(String id, String reference, String createdAt, String status, String paymentStatus,
                           List<PricedLineDto> lines, List<PricedPackageDto> packages, TotalsDto totals,
                           DeliveryDto delivery, PlacedByDto placedBy, String notes) {}

    // ---------- Support ----------
    public record SupportRequestIn(@NotBlank @Pattern(regexp = "^(order_enquiry|problem)$") String kind, String orderRef,
                                   @NotBlank @Size(min = 5, max = 4000) String message,
                                   @NotBlank @Pattern(regexp = "^\\+27[678]\\d{8}$") String contactPhone) {}
}
