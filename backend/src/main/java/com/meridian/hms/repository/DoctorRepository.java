package com.meridian.hms.repository;

import com.meridian.hms.domain.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    Optional<Doctor> findByUserId(Long userId);

    List<Doctor> findAllByOrderByUser_NameAsc();

    List<Doctor> findByActiveTrueOrderByUser_NameAsc();

    List<Doctor> findByDepartmentIdAndActiveTrueOrderByUser_NameAsc(Long departmentId);

    long countByDepartmentIdAndActiveTrue(Long departmentId);

    long countByActiveTrue();
}
