package com.meridian.hms.dto;

import com.meridian.hms.domain.Enums.Gender;
import com.meridian.hms.domain.Enums.LabPriority;
import com.meridian.hms.domain.Enums.LeaveStatus;
import com.meridian.hms.domain.Enums.PaymentMethod;
import com.meridian.hms.domain.Enums.Role;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Every request body the API accepts, grouped by module. */
public final class Requests {

    private Requests() {
    }

    // ------------------------------------------------------------------ auth
    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            String phone,
            LocalDate dob,
            Gender gender,
            Role role,
            @Size(max = 120) String professionalLicense,
            @Size(max = 1000) String applicationNote,
            Long departmentId,
            @Size(max = 120) String specialization) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 72) String newPassword) {
    }

    public record ProfileRequest(@NotBlank @Size(max = 120) String name, String phone) {
    }

    // ----------------------------------------------------------------- users
    public record StaffRequest(
            @NotBlank String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotNull Role role,
            String phone,
            String specialization,
            Long departmentId,
            BigDecimal consultationFee,
            String licenseNo,
            Integer experienceYears,
            String bio) {
    }

    public record StatusRequest(boolean active) {
    }

    // ----------------------------------------------------------- departments
    public record DepartmentRequest(
            @NotBlank String name,
            String description,
            @DecimalMin("0.0") BigDecimal consultationFee,
            Boolean active) {
    }

    // --------------------------------------------------------------- doctors
    public record DoctorUpdateRequest(
            String specialization,
            Long departmentId,
            BigDecimal consultationFee,
            String bio,
            String licenseNo,
            Integer experienceYears,
            String phone,
            Boolean active) {
    }

    public record SlotRequest(
            @NotNull Integer dayOfWeek,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            Integer slotMinutes) {
    }

    public record AvailabilityRequest(@NotEmpty List<SlotRequest> slots) {
    }

    public record LeaveRequest(
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @NotBlank String reason) {
    }

    public record LeaveDecisionRequest(@NotNull LeaveStatus status) {
    }

    // -------------------------------------------------------------- patients
    public record PatientUpdateRequest(
            String name,
            String phone,
            LocalDate dob,
            Gender gender,
            String bloodGroup,
            String address,
            String allergies,
            String emergencyContact,
            String insuranceProvider,
            String insuranceNumber) {
    }

    // ---------------------------------------------------------- appointments
    public record BookRequest(
            Long patientId,
            @NotNull Long doctorId,
            @NotNull LocalDateTime dateTime,
            Integer durationMinutes,
            String reason) {
    }

    public record CancelRequest(String reason) {
    }

    public record CompleteRequest(String notes) {
    }

    // ------------------------------------------------------- medical records
    public record PrescriptionItemRequest(
            @NotBlank String medicineName,
            String dosage,
            String frequency,
            Integer durationDays,
            Integer quantity,
            String instructions) {
    }

    public record PrescriptionRequest(
            @NotNull Long medicalRecordId,
            String advice,
            @NotEmpty List<PrescriptionItemRequest> items) {
    }

    public record MedicalRecordRequest(
            @NotNull Long appointmentId,
            @NotBlank String diagnosis,
            String symptoms,
            String bloodPressure,
            Integer pulse,
            Double temperature,
            Double weight,
            Double height,
            Integer spo2,
            String notes,
            LocalDate followUpDate,
            String advice,
            List<PrescriptionItemRequest> prescription,
            List<Long> labTestIds) {
    }

    // --------------------------------------------------------------- billing
    public record InvoiceItemRequest(String description, Integer quantity, BigDecimal unitPrice) {
    }

    public record InvoiceUpdateRequest(BigDecimal discount, List<InvoiceItemRequest> items, String notes) {
    }

    public record PaymentRequest(
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotNull PaymentMethod method,
            String reference) {
    }

    // -------------------------------------------------------------- pharmacy
    public record MedicineRequest(
            @NotBlank String name,
            @NotBlank String sku,
            String category,
            String manufacturer,
            String unit,
            @NotNull @DecimalMin("0.0") BigDecimal price,
            Integer reorderLevel,
            String description,
            Boolean active) {
    }

    public record StockRequest(
            @NotBlank String batchNo,
            @Min(1) int quantity,
            LocalDate expiryDate,
            String reason) {
    }

    public record DispenseRequest(@NotNull Long prescriptionId, String notes) {
    }

    // ------------------------------------------------------------------- lab
    public record LabTestRequest(
            @NotBlank String code,
            @NotBlank String name,
            String category,
            BigDecimal price,
            String sampleType,
            String referenceRange,
            String unit,
            Integer turnaroundHours,
            Boolean active) {
    }

    public record LabOrderRequest(
            @NotNull Long patientId,
            @NotNull Long testId,
            Long appointmentId,
            LabPriority priority) {
    }

    public record LabCollectRequest(String technician) {
    }

    public record LabResultRequest(
            @NotBlank String resultValue,
            String resultUnit,
            String referenceRange,
            String remarks) {
    }

    // ----------------------------------------------------------------- wards
    public record WardRequest(
            @NotBlank String name,
            String type,
            String floor,
            String description,
            Boolean active) {
    }

    public record BedRequest(
            @NotBlank String code,
            @NotNull @DecimalMin("0.0") BigDecimal dailyCharge) {
    }

    public record BedStatusRequest(@NotNull com.meridian.hms.domain.Enums.BedStatus status) {
    }

    public record AdmissionRequest(
            @NotNull Long patientId,
            @NotNull Long doctorId,
            @NotNull Long bedId,
            String diagnosis,
            String notes) {
    }

    public record DischargeRequest(String notes) {
    }
}
