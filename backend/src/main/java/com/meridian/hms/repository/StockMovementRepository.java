package com.meridian.hms.repository;

import com.meridian.hms.domain.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByOrderByCreatedAtDesc();

    List<StockMovement> findByMedicineIdOrderByCreatedAtDesc(Long medicineId);
}
