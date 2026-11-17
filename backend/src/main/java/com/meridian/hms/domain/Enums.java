package com.meridian.hms.domain;

/** All closed sets of values used by the domain, in one place. */
public final class Enums {

    private Enums() {
    }

    public enum Role {ADMIN, DOCTOR, PATIENT, RECEPTIONIST, PHARMACIST}

    public enum AppointmentStatus {BOOKED, COMPLETED, CANCELLED, NO_SHOW}

    public enum InvoiceStatus {PENDING, PARTIALLY_PAID, PAID, VOID}

    public enum PaymentMethod {CASH, CARD, UPI, INSURANCE, BANK_TRANSFER}

    public enum LabOrderStatus {ORDERED, COLLECTED, COMPLETED, CANCELLED}

    public enum LabPriority {ROUTINE, URGENT}

    public enum BedStatus {AVAILABLE, OCCUPIED, MAINTENANCE}

    public enum AdmissionStatus {ADMITTED, DISCHARGED}

    public enum StockMovementType {IN, OUT, ADJUSTMENT}

    public enum NotificationType {APPOINTMENT, BILLING, LAB, PHARMACY, ADMISSION, SYSTEM}

    public enum LeaveStatus {PENDING, APPROVED, REJECTED}

    public enum Gender {MALE, FEMALE, OTHER}
}
