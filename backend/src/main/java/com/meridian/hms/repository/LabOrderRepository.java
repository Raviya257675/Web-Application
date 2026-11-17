package com.meridian.hms.repository;

import com.meridian.hms.domain.Enums.LabOrderStatus;
import com.meridian.hms.domain.LabOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    List<LabOrder> findAllByOrderByOrderedAtDesc();

    List<LabOrder> findByPatientIdOrderByOrderedAtDesc(Long patientId);

    List<LabOrder> findByDoctorIdOrderByOrderedAtDesc(Long doctorId);

    List<LabOrder> findByStatusOrderByOrderedAtAsc(LabOrderStatus status);

    long countByStatusNot(LabOrderStatus status);

    long countByStatus(LabOrderStatus status);
}
