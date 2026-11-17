package com.meridian.hms.repository;

import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByPatientIdOrderByDateTimeDesc(Long patientId);

    List<Appointment> findByDoctorIdOrderByDateTimeAsc(Long doctorId);

    List<Appointment> findByDoctorIdAndDateTimeBetweenOrderByDateTimeAsc(Long doctorId, LocalDateTime from, LocalDateTime to);

    List<Appointment> findByDateTimeBetweenAndStatusOrderByDateTimeAsc(LocalDateTime from, LocalDateTime to, AppointmentStatus status);

    List<Appointment> findByStatusOrderByDateTimeAsc(AppointmentStatus status);

    List<Appointment> findByPatientIdAndStatusOrderByDateTimeDesc(Long patientId, AppointmentStatus status);

    List<Appointment> findByStatusAndDateTimeAfterOrderByDateTimeAsc(AppointmentStatus status, LocalDateTime after);

    long countByDoctorIdAndDateTimeBetween(Long doctorId, LocalDateTime from, LocalDateTime to);

    long countByStatusAndDateTimeBetween(AppointmentStatus status, LocalDateTime from, LocalDateTime to);

    long countByPatientId(Long patientId);

    long countByDoctorId(Long doctorId);

    boolean existsByPatientIdAndDoctorId(Long patientId, Long doctorId);

    long countByPatientIdAndDoctorId(Long patientId, Long doctorId);

    List<Appointment> findByPatientIdOrderByDateTimeAsc(Long patientId);

    List<Appointment> findByPatientIdAndDateTimeBetweenOrderByDateTimeAsc(Long patientId, LocalDateTime from, LocalDateTime to);

    @Query("""
            select a from Appointment a
            where a.doctor.id = :doctorId
              and a.status = :status
              and a.dateTime < :end
              and a.dateTime > :start
            """)
    List<Appointment> findDoctorConflicts(@Param("doctorId") Long doctorId,
                                          @Param("status") AppointmentStatus status,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    @Query("""
            select a from Appointment a
            where a.patient.id = :patientId
              and a.status = :status
              and a.dateTime < :end
              and a.dateTime > :start
            """)
    List<Appointment> findPatientConflicts(@Param("patientId") Long patientId,
                                           @Param("status") AppointmentStatus status,
                                           @Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);
}
