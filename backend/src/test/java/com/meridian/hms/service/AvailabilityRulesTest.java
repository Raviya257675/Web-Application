package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.DoctorAvailability;
import com.meridian.hms.domain.Enums.LeaveStatus;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.User;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorLeaveRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.security.AccessControl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvailabilityRulesTest {

    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private DoctorLeaveRepository leaveRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private AccessControl accessControl;
    @Mock
    private NotificationService notificationService;

    private DoctorService service;
    private Doctor doctor;
    private LocalDate monday;

    @BeforeEach
    void setUp() {
        service = new DoctorService(doctorRepository, departmentRepository, leaveRepository,
                appointmentRepository, accessControl, notificationService);

        User user = new User("Dr. Test", "test@hospital.test", "hash", Role.DOCTOR, null);
        Department department = new Department("Cardiology", "cardiology", "Test", new BigDecimal("4500.00"));
        doctor = new Doctor(user, "Cardiology", department, new BigDecimal("4500.00"));
        doctor.setId(1L);
        doctor.getAvailableSlots().add(new DoctorAvailability(doctor, 1,
                LocalTime.of(9, 0), LocalTime.of(13, 0), 30));

        monday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        when(leaveRepository.findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                anyLong(), any(LeaveStatus.class), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());
    }

    @Test
    void acceptsSlotOnTheGridInsideTheWindow() {
        assertDoesNotThrow(() -> service.assertWithinAvailability(doctor, monday.atTime(10, 0), 30));
        assertDoesNotThrow(() -> service.assertWithinAvailability(doctor, monday.atTime(12, 30), 30));
    }

    @Test
    void rejectsSlotOffTheGrid() {
        ApiException ex = assertThrows(ApiException.class,
                () -> service.assertWithinAvailability(doctor, monday.atTime(10, 10), 30));
        assertEquals("INVALID_SLOT_BOUNDARY", ex.code());
    }

    @Test
    void rejectsSlotOutsidePublishedHours() {
        ApiException ex = assertThrows(ApiException.class,
                () -> service.assertWithinAvailability(doctor, monday.atTime(14, 0), 30));
        assertEquals("OUTSIDE_AVAILABILITY", ex.code());
    }

    @Test
    void rejectsDayWithoutConsultingHours() {
        LocalDate tuesday = monday.plusDays(1);
        ApiException ex = assertThrows(ApiException.class,
                () -> service.assertWithinAvailability(doctor, tuesday.atTime(10, 0), 30));
        assertEquals("OUTSIDE_AVAILABILITY", ex.code());
    }
}
