package com.meridian.hms.repository;

import com.meridian.hms.domain.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Medicine m where m.id = :id")
    Optional<Medicine> lockById(@org.springframework.data.repository.query.Param("id") Long id);

    List<Medicine> findByActiveTrueOrderByNameAsc();

    List<Medicine> findAllByOrderByNameAsc();

    Optional<Medicine> findByNameIgnoreCase(String name);

    Optional<Medicine> findBySkuIgnoreCase(String sku);

    @Query("select m from Medicine m where m.active = true and m.stockQuantity <= m.reorderLevel order by m.stockQuantity asc")
    List<Medicine> findLowStock();

    @Query("select count(m) from Medicine m where m.active = true and m.stockQuantity <= m.reorderLevel")
    long countLowStock();

    @Query("select coalesce(sum(m.stockQuantity * m.price), 0) from Medicine m where m.active = true")
    java.math.BigDecimal stockValue();
}
