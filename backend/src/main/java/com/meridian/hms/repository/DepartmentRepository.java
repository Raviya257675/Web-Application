package com.meridian.hms.repository;

import com.meridian.hms.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findAllByOrderByNameAsc();

    List<Department> findByActiveTrueOrderByNameAsc();

    Optional<Department> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsBySlug(String slug);
}
