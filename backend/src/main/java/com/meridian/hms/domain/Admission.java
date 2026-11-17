package com.meridian.hms.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.meridian.hms.domain.Enums.AdmissionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "admissions")
@Getter
@Setter
@NoArgsConstructor
public class Admission extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "bed_id", nullable = false)
    private Bed bed;

    @Column(nullable = false)
    private LocalDateTime admittedAt = LocalDateTime.now();

    private LocalDateTime dischargedAt;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdmissionStatus status = AdmissionStatus.ADMITTED;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal dailyCharge = BigDecimal.ZERO;

    @JsonIgnore
    @OneToOne(mappedBy = "admission", fetch = FetchType.LAZY)
    private Invoice invoice;

    public Admission(Patient patient, Doctor doctor, Bed bed, String diagnosis, String notes) {
        this.patient = patient;
        this.doctor = doctor;
        this.bed = bed;
        this.diagnosis = diagnosis;
        this.notes = notes;
        this.dailyCharge = bed.getDailyCharge();
    }
}
