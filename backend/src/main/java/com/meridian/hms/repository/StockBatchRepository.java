package com.meridian.hms.repository;

import com.meridian.hms.domain.StockBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface StockBatchRepository extends JpaRepository<StockBatch, Long> {

    List<StockBatch> findByMedicineIdOrderByExpiryDateAsc(Long medicineId);

    List<StockBatch> findByMedicineIdAndQuantityGreaterThanOrderByExpiryDateAsc(Long medicineId, int quantity);

    List<StockBatch> findByExpiryDateBeforeAndQuantityGreaterThanOrderByExpiryDateAsc(LocalDate date, int quantity);
}
