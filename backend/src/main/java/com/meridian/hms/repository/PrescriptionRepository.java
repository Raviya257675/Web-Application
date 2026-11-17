package com.meridian.hms.repository;

import com.meridian.hms.domain.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Prescription p where p.id = :id")
    Optional<Prescription> lockById(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<Prescription> findByMedicalRecordId(Long medicalRecordId);

    List<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<Prescription> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    List<Prescription> findAllByOrderByCreatedAtDesc();
}
