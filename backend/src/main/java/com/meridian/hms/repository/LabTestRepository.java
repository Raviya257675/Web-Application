package com.meridian.hms.repository;

import com.meridian.hms.domain.LabTest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LabTestRepository extends JpaRepository<LabTest, Long> {

    List<LabTest> findByActiveTrueOrderByNameAsc();

    List<LabTest> findAllByOrderByNameAsc();

    Optional<LabTest> findByCodeIgnoreCase(String code);
}
