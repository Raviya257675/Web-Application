package com.meridian.hms.repository;

import com.meridian.hms.domain.Dispense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DispenseRepository extends JpaRepository<Dispense, Long> {
    boolean existsByPrescriptionId(Long prescriptionId);

    List<Dispense> findByOrderByCreatedAtDesc();

    List<Dispense> findByPatientIdOrderByCreatedAtDesc(Long patientId);
}
