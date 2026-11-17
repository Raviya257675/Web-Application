package com.meridian.hms.repository;

import com.meridian.hms.domain.Admission;
import com.meridian.hms.domain.Enums.AdmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdmissionRepository extends JpaRepository<Admission, Long> {

    List<Admission> findAllByOrderByAdmittedAtDesc();

    List<Admission> findByPatientIdOrderByAdmittedAtDesc(Long patientId);

    List<Admission> findByStatusOrderByAdmittedAtDesc(AdmissionStatus status);

    Optional<Admission> findByBedIdAndStatus(Long bedId, AdmissionStatus status);

    long countByStatus(AdmissionStatus status);
}
