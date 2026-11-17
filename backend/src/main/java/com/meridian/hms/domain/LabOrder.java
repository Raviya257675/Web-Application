package com.meridian.hms.domain;

import com.meridian.hms.domain.Enums.LabOrderStatus;
import com.meridian.hms.domain.Enums.LabPriority;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "lab_orders")
@Getter
@Setter
@NoArgsConstructor
public class LabOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "test_id", nullable = false)
    private LabTest test;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LabOrderStatus status = LabOrderStatus.ORDERED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LabPriority priority = LabPriority.ROUTINE;

    @Column(nullable = false)
    private LocalDateTime orderedAt = LocalDateTime.now();

    private LocalDateTime collectedAt;

    private LocalDateTime completedAt;

    private String resultValue;

    private String resultUnit;

    private String referenceRange;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    private String technician;

    public LabOrder(Patient patient, Doctor doctor, LabTest test, LabPriority priority) {
        this.patient = patient;
        this.doctor = doctor;
        this.test = test;
        this.priority = priority;
    }
}
