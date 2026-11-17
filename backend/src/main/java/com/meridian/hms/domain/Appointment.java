package com.meridian.hms.domain;

import com.meridian.hms.domain.Enums.AppointmentStatus;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
public class Appointment extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false)
    private LocalDateTime dateTime;

    private int durationMinutes = 30;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status = AppointmentStatus.BOOKED;

    private String reason;

    private LocalDateTime checkedInAt;

    /** Position in the doctor's queue for that day - assigned at booking time. */
    private Integer tokenNumber;

    @Column(precision = 12, scale = 2)
    private BigDecimal fee;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Appointment(Patient patient, Doctor doctor, LocalDateTime dateTime, int durationMinutes, String reason) {
        this.patient = patient;
        this.doctor = doctor;
        this.dateTime = dateTime;
        this.durationMinutes = durationMinutes;
        this.reason = reason;
    }
}
