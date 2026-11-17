package com.meridian.hms.repository;

import com.meridian.hms.domain.DoctorLeave;
import com.meridian.hms.domain.Enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DoctorLeaveRepository extends JpaRepository<DoctorLeave, Long> {

    List<DoctorLeave> findByDoctorIdOrderByStartDateDesc(Long doctorId);

    List<DoctorLeave> findAllByOrderByStartDateDesc();

    List<DoctorLeave> findByStatusOrderByStartDateAsc(LeaveStatus status);

    List<DoctorLeave> findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long doctorId, LeaveStatus status, LocalDate end, LocalDate start);
}
