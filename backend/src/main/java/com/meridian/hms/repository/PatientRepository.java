package com.meridian.hms.repository;

import com.meridian.hms.domain.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByUserId(Long userId);

    List<Patient> findAllByOrderByCreatedAtDesc();

    Optional<Patient> findByUserEmailIgnoreCase(String email);

    long countByUserIdIn(List<Long> userIds);
}
