package com.meridian.hms.repository;

import com.meridian.hms.domain.Ward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WardRepository extends JpaRepository<Ward, Long> {

    List<Ward> findAllByOrderByNameAsc();

    List<Ward> findByActiveTrueOrderByNameAsc();

    Optional<Ward> findByNameIgnoreCase(String name);
}
