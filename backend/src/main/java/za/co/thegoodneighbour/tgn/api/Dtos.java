package za.co.thegoodneighbour.tgn.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** Wire contracts. Customer-facing shapes are mirrored in mobile/src/types and admin/src/types. */
public final class Dtos {
    private Dtos() {}

    static final String PHONE = "^\\+27[678]\\d{8}$";
    static final String DATE = "^\\d{4}-\\d{2}-\\d{2}$";
    static final String ID13 = "^\\d{13}$";

    // ---------- Cover options (public) ----------
    public record RelationshipRuleDto(@NotBlank String relationship, @Min(0) @Max(100000) int multiplierBps, @Min(0) @Max(120) int minAge,
                                      @Min(0) @Max(120) int maxAge, @Min(0) @Max(120) int coverEndAge, @Min(0) @Max(20) int maxCount) {}
    /** monthlyCents is what one unit adds to the main member's monthly premium. Cost to the company is never exposed. */
    public record BenefitItemDto(String id, String kind, String name, String description, String unitLabel, long valueCents, long monthlyCents,
                                 int maxQty, String groupId, List<String> contents, boolean available) {}
    public record AgeBandDto(@Min(0) @Max(130) int fromAge, @Min(0) @Max(130) int toAge, @Min(0) @Max(100000) int multiplierBps) {}
    public record CoverOptionsDto(List<BenefitItemDto> items, List<RelationshipRuleDto> relationships, List<AgeBandDto> ageBands, long minBundleValueCents,
                                  int mainMinAge, int mainMaxAge, int maxMembers, int naturalWaitingDays, int accidentalWaitingDays,
                                  int upgradeWaitingDays, int lapseAfterMissedPayments, int reinstateWithinDays, int escalationCapPercent,
                                  List<Integer> debitDays, int coolingOffDays, long minContributionCents) {}

    // ---------- Waiting list (public) ----------
    public record WaitlistIn(@NotBlank @Size(max = 60) String firstName,
                             @Pattern(regexp = PHONE, message = "Please use a valid South African mobile number.") String phone,
                             @Email @Size(max = 120) String email,
                             @Size(max = 40) String province,
                             @AssertTrue(message = "Please tick the box so we know it's OK to contact you.") boolean consent,
                             String website) {}
    public record WaitlistItemDto(String id, String firstName, String phone, String email, String province, String createdAt) {}

    // ---------- Quote ----------
    public record BundleLineIn(@NotBlank String itemId, @Min(0) @Max(20) int quantity) {}
    public record QuoteMemberIn(@NotBlank String relationship, @Pattern(regexp = DATE) String dateOfBirth) {}
    public record QuoteRequest(@NotNull List<@Valid BundleLineIn> items, List<@Valid QuoteMemberIn> members,
                               @Pattern(regexp = DATE) String holderDateOfBirth, Boolean coverMainMember) {}
    public record BundleLineDto(String itemId, String kind, String name, int quantity, long valueCents, long monthlyCents, List<String> contents) {}
    /** One person's price: base x relationship % x age %. role is "you" for the main member, otherwise the relationship. age is null while unknown. */
    public record PersonQuoteDto(String role, Integer age, int relationshipBps, int ageBps, long feeCents) {}
    public record QuoteDto(boolean valid, List<String> problems, List<BundleLineDto> lines, long bundleValueCents, long baseMonthlyCents,
                           PersonQuoteDto main, List<PersonQuoteDto> members, long totalMonthlyCents, boolean mainCovered) {}

    // ---------- Auth ----------
    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 100) String fullName,
            @NotBlank @Pattern(regexp = PHONE, message = "Please use a valid South African mobile number.") String phone,
            @Email String email,
            @NotBlank @Size(min = 8, max = 100, message = "Use at least 8 characters.") String password) {}
    public record LoginRequest(@NotBlank String phone, @NotBlank String password) {}
    public record UserDto(String id, String fullName, String phone, String email, boolean phoneVerified, boolean notifyClaims,
                          boolean notifyPayments, boolean notifyNews) {}
    public record MeDto(UserDto user, boolean smsEnabled) {}
    public record PhoneIn(@NotBlank @Pattern(regexp = PHONE, message = "Please use a valid South African mobile number.") String phone) {}
    public record CodeIn(@NotBlank @Pattern(regexp = "^\\d{6}$", message = "Codes have 6 digits.") String code) {}
    public record PasswordResetConfirm(@NotBlank @Pattern(regexp = PHONE) String phone, @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Codes have 6 digits.") String code,
                                       @NotBlank @Size(min = 8, max = 100, message = "Use at least 8 characters.") String newPassword) {}
    public record ChangePasswordIn(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 100, message = "Use at least 8 characters.") String newPassword) {}
    public record ChangePhoneConfirm(@NotBlank @Pattern(regexp = PHONE) String newPhone, @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Codes have 6 digits.") String code) {}
    public record NotificationsIn(boolean claims, boolean payments, boolean news) {}
    public record DeleteAccountIn(@NotBlank String password) {}
    public record DeleteAccountResult(String state, String message) {}
    public record Accepted(String message) {}

    // ---------- Legal ----------
    public record LegalSummaryDto(String slug, String title, int version, boolean draft) {}
    public record LegalDocDto(String slug, String title, String body, int version, boolean draft, String updatedAt) {}
    public record LegalUpdate(@NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 60000) String body, boolean draft) {}
    public record SessionDto(UserDto user, String token) {}
    public record ProfileRequest(@NotBlank @Size(min = 2, max = 100) String fullName, @Email String email) {}
    public record StaffLoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record StaffDto(String id, String email, String fullName, String role) {}
    public record StaffSessionDto(StaffDto staff, String token) {}

    // ---------- Policies ----------
    public record MemberIn(@NotBlank String relationship, @NotBlank @Size(min = 2, max = 100) String fullName,
                           @Pattern(regexp = ID13, message = "ID numbers have 13 digits.") String idNumber,
                           @NotBlank @Pattern(regexp = DATE, message = "Use the format yyyy-mm-dd for dates.") String dateOfBirth) {}
    public record ApplyRequest(@NotEmpty List<@Valid BundleLineIn> items,
                               @NotBlank @Pattern(regexp = ID13, message = "ID numbers have 13 digits.") String holderIdNumber,
                               @Min(1) @Max(31) int debitDay, List<@Valid MemberIn> members,
                               @NotNull Integer acceptedTermsVersion, @NotNull Integer acceptedPrivacyVersion, Boolean coverMainMember) {}
    /** Every field is optional: only what is sent is changed. */
    public record EditMemberIn(@Size(min = 2, max = 100) String fullName,
                               @Pattern(regexp = ID13, message = "ID numbers have 13 digits.") String idNumber,
                               @Pattern(regexp = DATE, message = "Use the format yyyy-mm-dd for dates.") String dateOfBirth, String relationship) {}
    public record BundleChangeRequest(@NotEmpty List<@Valid BundleLineIn> items) {}
    public record MemberDto(String id, String relationship, String fullName, String idNumber, String dateOfBirth, long feeCents,
                            String status, String coverStartsOn, int age, int relationshipBps, int ageBps) {}
    public record PaymentDto(String id, long amountCents, String paidOn, String status, String source, String reference, String paidBy) {}
    /** One person sharing a plan's cost. The phone is shown only to the plan's owner. */
    public record ContributorDto(String id, String name, String phone, String status, int shareBps, long shareCents, long paidThisMonthCents) {}
    public record HolderDto(String name, String idNumber, String dateOfBirth) {}
    /** What the family is owed. Earlier versions stay on record because an upgrade only applies after its waiting period. */
    public record BundleVersionDto(int version, String effectiveFrom, String upgradeWaitingEndsOn, long bundleValueCents,
                                   long baseMonthlyCents, List<BundleLineDto> lines) {}
    public record PolicyDto(String id, String reference, String status, HolderDto holder, int debitDay, long monthlyTotalCents,
                            long baseMonthlyCents, long mainFeeCents, int mainAgeBps, int holderAge, String mandateStatus, String createdAt, String startDate, String waitingEndsOn,
                            String nextDebitDate, BundleVersionDto bundle, List<BundleVersionDto> bundleHistory,
                            List<MemberDto> members, List<PaymentDto> payments, Integer termsVersion, Integer privacyVersion, String consentAt,
                            String lapsedAt, String reinstateUntil, String cancelledAt, String cancelRequestedAt, String reinstateRequestedAt,
                            boolean withinCoolingOff, List<ContributorDto> contributors, int ownerShareBps, long ownerShareCents, long ownerPaidThisMonthCents, boolean coversMainMember,
                            List<InMemoryDto> inMemory, String holderDiedOn, String continuationUntil) {}
    /** Someone on the plan who has passed away. Their cover and premium have ended. */
    public record InMemoryDto(String name, String relationship, String passedOn) {}
    /** Staff hand a plan to a new owner after the owner or main member has died. Exactly one of memberId or contributorId. */
    public record SuccessorIn(String memberId, String contributorId, @Pattern(regexp = PHONE) String phone, @Pattern(regexp = ID13) String idNumber,
                              @Pattern(regexp = DATE) String ownerDiedOn) {}
    public record CancelRequestIn(@Size(max = 100) String reason, @Size(max = 1000) String note) {}
    public record ReinstateRequestIn(@Size(max = 1000) String note) {}
    public record DebitOrderState(String state, String message) {}

    // ---------- Claims ----------
    public record DeliveryIn(@NotBlank @Size(max = 100) String recipientName, @NotBlank @Pattern(regexp = PHONE) String recipientPhone,
                             @NotBlank @Size(max = 200) String addressLine, @NotBlank @Size(max = 100) String suburb,
                             @NotBlank @Size(max = 100) String city, @NotBlank @Size(max = 50) String province,
                             @Pattern(regexp = "^\\d{4}$", message = "Postal codes have 4 digits.") String postalCode,
                             @Size(max = 1000) String instructions) {}
    public record ClaimIn(@NotBlank String policyId, String memberId, @NotBlank @Pattern(regexp = DATE) String dateOfDeath,
                          @NotBlank @Pattern(regexp = "^(natural|accidental)$") String causeOfDeath,
                          @NotBlank @Size(min = 2, max = 100) String claimantName, @NotBlank @Pattern(regexp = PHONE) String claimantPhone,
                          @NotNull @Valid DeliveryIn delivery) {}
    public record ClaimDocumentDto(String id, String type, String fileName, String contentType, long sizeBytes, String createdAt) {}
    public record ClaimDto(String id, String reference, String policyId, String policyReference, String deceasedName, String dateOfDeath,
                           String causeOfDeath, String claimantName, String claimantPhone, String status, boolean withinWaitingPeriod,
                           boolean overAgeLimit, String staffNote, DeliveryIn delivery, BundleVersionDto bundle, String createdAt, String updatedAt,
                           List<ClaimDocumentDto> documents, List<String> missingDocuments,
                           String deliveryDate, String deliveryWindow, String deliveryNote, String deliveredAt,
                           String benefitChoice, long cashAlternativeCents, Long ourCostCents) {}
    public record ClaimChoiceIn(@NotBlank @Pattern(regexp = "^(bundle|cash)$", message = "Choose the bundle or cash.") String choice) {}
    public record ScheduleDelivery(@NotBlank @Pattern(regexp = DATE) String date, @Pattern(regexp = "^(morning|afternoon|day)$") String window,
                                   @Size(max = 1000) String note) {}

    // ---------- Family plans (sharing the cost) ----------
    public record InviteContributorIn(@NotBlank @Size(max = 60) String name,
                                      @NotBlank @Pattern(regexp = PHONE, message = "Please use a valid South African mobile number.") String phone,
                                      @Min(value = 5, message = "A share is at least 5%.") @Max(value = 90, message = "A share is at most 90%.") int sharePercent) {}
    public record SharePercentIn(@Min(value = 5, message = "A share is at least 5%.") @Max(value = 90, message = "A share is at most 90%.") int sharePercent) {}
    public record InvitationDto(String id, String ownerName, int shareBps, long shareCents, long monthlyTotalCents, String bundleSummary, int peopleCovered, String invitedAt) {}
    public record InvitationsDto(boolean needsVerification, List<InvitationDto> items) {}
    public record SharedMemberDto(String relationship, String fullName, int age) {}
    /** What someone who shares the cost may see of the plan. No ID numbers and no phone numbers. */
    public record SharedPolicyDto(String contributorId, String policyId, String reference, String ownerName, String status, long monthlyTotalCents,
                                  int myShareBps, long myShareCents, long myPaidThisMonthCents, String nextDebitDate, List<BundleLineDto> bundleLines,
                                  List<SharedMemberDto> members, List<ContributorDto> contributors, int ownerShareBps, long ownerShareCents, long ownerPaidThisMonthCents) {}

    // ---------- Notifications ----------
    public record NotificationDto(String id, String category, String title, String body, String refType, String refId, boolean read, String createdAt) {}
    public record NotificationsDto(long unread, List<NotificationDto> items) {}

    // ---------- Support ----------
    public record SupportRequestIn(@NotBlank @Pattern(regexp = "^(policy_enquiry|claim_enquiry|problem)$") String kind, String reference,
                                   @NotBlank @Size(min = 5, max = 4000) String message, @NotBlank @Pattern(regexp = PHONE) String contactPhone) {}

    // ---------- Admin ----------
    public record AdminPolicyDto(PolicyDto policy, UserDto customer) {}
    public record SupportItemDto(String id, String kind, String reference, String message, String contactPhone, String status, String staffNote,
                                 String createdAt, UserDto customer) {}
    public record CustomerDto(String id, String fullName, String phone, String email, boolean phoneVerified, String createdAt,
                              String policyId, String policyReference, String policyStatus) {}
    public record CollectionRowDto(String policyId, String reference, String holderName, String phone, long monthlyCents, int debitDay, String nextDebitDate,
                                   int paymentsReceived, int missed, String oldestUnpaidSince, long owedCents, boolean shouldLapse, boolean dueSoon, String continuationUntil) {}
    public record CollectionsDto(List<CollectionRowDto> rows, long active, long behind, long shouldLapse, long dueSoon, long owedCents, long dueSoonCents, int lapseAfter) {}
    /** madeInError is used when declining a claim: true means nobody has actually passed away, so their cover carries on. */
    public record StatusChange(@NotBlank String status, @Size(max = 1000) String note, Boolean madeInError) {}
    public record RecordPayment(@Positive long amountCents, @NotBlank @Pattern(regexp = DATE) String paidOn,
                                @NotBlank @Size(max = 100) String reference, String contributorId) {}
    public record Dashboard(long pendingReview, long approvedAwaitingPayment, long active, long lapsed, long openClaims, long monthlyRecurringCents,
                            long cancellationRequests, long reinstatementRequests) {}
    public record AuditDto(String at, String actor, String action, String entityType, String entityId, String detail) {}

    public record CoverConfigDto(@Min(1) @Max(5000) int baseRateBps, @PositiveOrZero long minBundleValueCents, @Min(0) @Max(1095) int naturalWaitingDays,
                                 @Min(0) @Max(1095) int accidentalWaitingDays, @Min(0) @Max(1095) int upgradeWaitingDays,
                                 @Min(0) @Max(120) int mainMinAge, @Min(0) @Max(120) int mainMaxAge, @Min(0) @Max(120) int mainCoverEndAge,
                                 @Min(1) @Max(50) int maxMembers, @Min(1) @Max(1000) int maxCommitmentMultiple,
                                 @Min(1) @Max(12) int lapseAfterMissedPayments, @Min(0) @Max(730) int reinstateWithinDays,
                                 @Min(0) @Max(10000) int escalationCapBps, @Min(0) @Max(365) int coolingOffDays,
                                 @NotNull @Valid List<RelationshipRuleDto> relationships, @NotNull @Valid List<AgeBandDto> ageBands,
                                 @Min(1000) @Max(20000) Integer cashAlternativeBps, @Min(0) @Max(1000000) Long minContributionCents) {}
    public record BenefitItemAdminDto(String id, String kind, String name, String description, String unitLabel, long valueCents, long costCents,
                                      int maxQty, String groupId, boolean active, Integer onFarm, List<String> contents) {}
    public record BenefitItemUpdate(@NotBlank @Size(max = 100) String name, @Size(max = 1000) String description, @Positive long valueCents,
                                    @Positive long costCents, @Min(0) @Max(20) int maxQty, boolean active, @Min(0) Integer onFarm,
                                    @NotNull List<@Size(max = 200) String> contents) {}
    public record HerdDto(String itemId, String name, int onFarm, long promised, long capacity, long remaining) {}
}
