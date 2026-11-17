package com.meridian.hms.repository;

import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> lockById(@Param("id") Long id);

    Optional<Invoice> findByAppointmentId(Long appointmentId);

    Optional<Invoice> findByAdmissionId(Long admissionId);

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    List<Invoice> findAllByOrderByCreatedAtDesc();

    List<Invoice> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<Invoice> findByStatusOrderByCreatedAtDesc(InvoiceStatus status);

    long countByStatus(InvoiceStatus status);

    @Query("select coalesce(sum(i.totalAmount), 0) from Invoice i where i.status <> :voidStatus")
    BigDecimal sumBilled(@Param("voidStatus") InvoiceStatus voidStatus);

    @Query("select coalesce(sum(i.amountPaid), 0) from Invoice i where i.status <> :voidStatus")
    BigDecimal sumCollected(@Param("voidStatus") InvoiceStatus voidStatus);

    @Query("""
            select coalesce(sum(i.totalAmount), 0) from Invoice i
            where i.status <> :voidStatus and i.createdAt >= :from
            """)
    BigDecimal sumBilledSince(@Param("voidStatus") InvoiceStatus voidStatus, @Param("from") LocalDateTime from);

    @Query("""
            select coalesce(sum(i.amountPaid), 0) from Invoice i
            where i.status <> :voidStatus and i.createdAt >= :from
            """)
    BigDecimal sumCollectedSince(@Param("voidStatus") InvoiceStatus voidStatus, @Param("from") LocalDateTime from);

    long countByCreatedAtAfter(LocalDateTime from);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    List<Invoice> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
