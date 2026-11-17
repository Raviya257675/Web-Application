package com.meridian.hms.repository;

import com.meridian.hms.domain.Bed;
import com.meridian.hms.domain.Enums.BedStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BedRepository extends JpaRepository<Bed, Long> {

    List<Bed> findByWardIdOrderByCodeAsc(Long wardId);

    List<Bed> findByStatusOrderByWard_NameAscCodeAsc(BedStatus status);

    long countByWardId(Long wardId);

    long countByWardIdAndStatus(Long wardId, BedStatus status);

    long countByStatus(BedStatus status);
}
