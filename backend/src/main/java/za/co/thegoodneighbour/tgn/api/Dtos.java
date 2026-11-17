package za.co.thegoodneighbour.tgn.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** Wire contracts. Customer-facing shapes are mirrored in mobile/src/types and admin/src/types. */
public final class Dtos {
    private Dtos() {}

    static final String PHONE = "^\\+27[678]\\d{8}$";
    static final String DATE = "^\\d{4}-\\d{2}-\\d{2}$";

    // ---------- Plans ----------
    public record MemberRuleDto(@NotBlank String type, @PositiveOrZero long feeCents, @PositiveOrZero long coverCents,
                                @Min(0) @Max(20) int maxCount, @Min(0) @Max(120) int minAge, @Min(0) @Max(120) int maxAge) {}
    public record PlanDto(String id, String name, String description, long coverCents, long premiumCents, int waitingPeriodDays,
                          int minAge, int maxAge, String accent, boolean active, List<MemberRuleDto> memberRules) {}
    public record PlanUpdate(@NotBlank @Size(max = 100) String name, @Size(max = 1000) String description,
                             @Positive long coverCents, @Positive long premiumCents, @Min(0) @Max(730) int waitingPeriodDays,
                             @Min(0) @Max(120) int minAge, @Min(0) @Max(120) int maxAge, boolean active,
                             @NotNull @Valid List<MemberRuleDto> memberRules) {}

    // ---------- Auth ----------
    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 100) String fullName,
            @NotBlank @Pattern(regexp = PHONE, message = "Please use a valid South African mobile number.") String phone,
            @Email String email,
            @NotBlank @Size(min = 8, max = 100, message = "Use at least 8 characters.") String password) {}
    public record LoginRequest(@NotBlank String phone, @NotBlank String password) {}
    public record UserDto(String id, String fullName, String phone, String email) {}
    public record SessionDto(UserDto user, String token) {}
    public record ProfileRequest(@NotBlank @Size(min = 2, max = 100) String fullName, @Email String email) {}
    public record StaffLoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record StaffDto(String id, String email, String fullName, String role) {}
    public record StaffSessionDto(StaffDto staff, String token) {}

    // ---------- Policies ----------
    public record MemberIn(@NotBlank String type, @NotBlank @Size(min = 2, max = 100) String fullName,
                           @Pattern(regexp = "^\\d{13}$", message = "ID numbers have 13 digits.") String idNumber,
                           @NotBlank @Pattern(regexp = DATE, message = "Use the format yyyy-mm-dd for dates.") String dateOfBirth) {}
    public record ApplyRequest(@NotBlank String planId,
                               @NotBlank @Pattern(regexp = "^\\d{13}$", message = "ID numbers have 13 digits.") String holderIdNumber,
                               @Min(1) @Max(31) int debitDay, List<@Valid MemberIn> members) {}
    public record MemberDto(String id, String type, String fullName, String idNumber, String dateOfBirth, long feeCents,
                            long coverCents, String status, String coverStartsOn) {}
    public record PaymentDto(String id, long amountCents, String paidOn, String status, String source, String reference) {}
    public record HolderDto(String name, String idNumber, String dateOfBirth) {}
    public record PolicyDto(String id, String reference, String planId, String planName, long coverCents, String status,
                            HolderDto holder, int debitDay, long monthlyTotalCents, String mandateStatus, String createdAt,
                            String startDate, String waitingEndsOn, String nextDebitDate, List<MemberDto> members,
                            List<PaymentDto> payments) {}
    public record DebitOrderState(String state, String message) {}

    // ---------- Claims ----------
    public record ClaimIn(@NotBlank String policyId, String memberId,
                          @NotBlank @Pattern(regexp = DATE) String dateOfDeath,
                          @NotBlank @Size(min = 2, max = 100) String claimantName,
                          @NotBlank @Pattern(regexp = PHONE) String claimantPhone) {}
    public record ClaimDto(String id, String reference, String policyId, String policyReference, String deceasedName,
                           String dateOfDeath, String claimantName, String claimantPhone, String status,
                           boolean withinWaitingPeriod, String staffNote, String createdAt, String updatedAt) {}

    // ---------- Support ----------
    public record SupportRequestIn(@NotBlank @Pattern(regexp = "^(policy_enquiry|claim_enquiry|problem)$") String kind, String reference,
                                   @NotBlank @Size(min = 5, max = 4000) String message,
                                   @NotBlank @Pattern(regexp = PHONE) String contactPhone) {}

    // ---------- Admin ----------
    public record AdminPolicyDto(PolicyDto policy, UserDto customer) {}
    public record StatusChange(@NotBlank String status, @Size(max = 1000) String note) {}
    public record RecordPayment(@Positive long amountCents, @NotBlank @Pattern(regexp = DATE) String paidOn,
                                @NotBlank @Size(max = 100) String reference) {}
    public record Dashboard(long pendingReview, long approvedAwaitingPayment, long active, long lapsed, long openClaims,
                            long monthlyRecurringCents) {}
    public record AuditDto(String at, String actor, String action, String entityType, String entityId, String detail) {}
}
