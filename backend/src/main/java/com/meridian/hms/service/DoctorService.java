package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.DoctorAvailability;
import com.meridian.hms.domain.DoctorLeave;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import com.meridian.hms.domain.Enums.LeaveStatus;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.dto.Dtos.AvailabilityResponse;
import com.meridian.hms.dto.Dtos.SlotDto;
import com.meridian.hms.dto.Dtos.WindowDto;
import com.meridian.hms.dto.Requests.AvailabilityRequest;
import com.meridian.hms.dto.Requests.DoctorUpdateRequest;
import com.meridian.hms.dto.Requests.LeaveRequest;
import com.meridian.hms.dto.Requests.SlotRequest;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorLeaveRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorLeaveRepository leaveRepository;
    private final AppointmentRepository appointmentRepository;
    private final AccessControl accessControl;
    private final NotificationService notificationService;

    public DoctorService(DoctorRepository doctorRepository, DepartmentRepository departmentRepository,
                         DoctorLeaveRepository leaveRepository, AppointmentRepository appointmentRepository,
                         AccessControl accessControl, NotificationService notificationService) {
        this.doctorRepository = doctorRepository;
        this.departmentRepository = departmentRepository;
        this.leaveRepository = leaveRepository;
        this.appointmentRepository = appointmentRepository;
        this.accessControl = accessControl;
        this.notificationService = notificationService;
    }

    public List<Doctor> list(Long departmentId, String search, boolean includeInactive) {
        List<Doctor> doctors = departmentId != null
                ? doctorRepository.findByDepartmentIdAndActiveTrueOrderByUser_NameAsc(departmentId)
                : includeInactive ? doctorRepository.findAllByOrderByUser_NameAsc()
                : doctorRepository.findByActiveTrueOrderByUser_NameAsc();
        if (search != null && !search.isBlank()) {
            String needle = search.toLowerCase(Locale.ROOT);
            doctors = doctors.stream().filter(d ->
                    d.getUser().getName().toLowerCase(Locale.ROOT).contains(needle)
                            || d.getSpecialization().toLowerCase(Locale.ROOT).contains(needle)
                            || d.getDepartment().getName().toLowerCase(Locale.ROOT).contains(needle)).toList();
        }
        return doctors;
    }

    public Doctor get(Long id) {
        return doctorRepository.findById(id).orElseThrow(() -> ApiException.notFound("Doctor"));
    }

    public Doctor me(AuthUser user) {
        return accessControl.currentDoctor(user);
    }

    @Transactional
    public Doctor update(AuthUser user, Long id, DoctorUpdateRequest request) {
        Doctor doctor = get(id);
        boolean self = user.isDoctor() && id.equals(user.doctorId());
        if (!user.isAdmin() && !self) {
            throw ApiException.forbidden("FORBIDDEN", "You can only edit your own profile");
        }
        if (request.specialization() != null && !request.specialization().isBlank()) {
            doctor.setSpecialization(request.specialization().trim());
        }
        if (request.departmentId() != null) {
            Department department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> ApiException.notFound("Department"));
            doctor.setDepartment(department);
        }
        if (request.consultationFee() != null) {
            doctor.setConsultationFee(request.consultationFee());
        }
        if (request.bio() != null) doctor.setBio(request.bio());
        if (request.licenseNo() != null) doctor.setLicenseNo(request.licenseNo());
        if (request.experienceYears() != null) doctor.setExperienceYears(request.experienceYears());
        if (request.phone() != null) doctor.getUser().setPhone(request.phone());
        if (user.isAdmin() && request.active() != null) {
            doctor.setActive(request.active());
        }
        return doctorRepository.save(doctor);
    }

    @Transactional
    public List<DoctorAvailability> setAvailability(AuthUser user, Long id, AvailabilityRequest request) {
        Doctor doctor = get(id);
        boolean self = user.isDoctor() && id.equals(user.doctorId());
        if (!user.isAdmin() && !self) {
            throw ApiException.forbidden("FORBIDDEN", "You can only edit your own consulting hours");
        }
        for (SlotRequest slot : request.slots()) {
            if (slot.dayOfWeek() < 1 || slot.dayOfWeek() > 7) {
                throw ApiException.badRequest("INVALID_DAY", "dayOfWeek must be between 1 (Monday) and 7 (Sunday)");
            }
            if (!slot.startTime().isBefore(slot.endTime())) {
                throw ApiException.badRequest("INVALID_WINDOW", "A window must start before it ends");
            }
            if (slot.startTime().getMinute() != 0 && slot.startTime().getMinute() != 30) {
                throw ApiException.badRequest("INVALID_WINDOW", "Windows must start on the hour or half hour");
            }
        }
        doctor.getAvailableSlots().clear();
        for (SlotRequest slot : request.slots()) {
            doctor.getAvailableSlots().add(new DoctorAvailability(doctor, slot.dayOfWeek(),
                    slot.startTime(), slot.endTime(), slot.slotMinutes() == null ? 30 : slot.slotMinutes()));
        }
        doctor.getAvailableSlots().sort(Comparator.comparingInt(DoctorAvailability::getDayOfWeek)
                .thenComparing(DoctorAvailability::getStartTime));
        doctorRepository.save(doctor);
        return doctor.getAvailableSlots();
    }

    public AvailabilityResponse availability(Long doctorId, LocalDate date) {
        Doctor doctor = get(doctorId);
        LocalDate day = date == null ? LocalDate.now() : date;
        int dayOfWeek = day.getDayOfWeek().getValue();
        List<DoctorAvailability> windows = doctor.getAvailableSlots().stream()
                .filter(w -> w.getDayOfWeek() == dayOfWeek)
                .sorted(Comparator.comparing(DoctorAvailability::getStartTime))
                .toList();

        List<WindowDto> windowDtos = windows.stream()
                .map(w -> new WindowDto(w.getDayOfWeek(), w.getStartTime().toString(), w.getEndTime().toString(),
                        w.getSlotMinutes()))
                .toList();

        boolean onLeave = isOnApprovedLeave(doctor, day);
        List<Appointment> dayAppointments = appointmentRepository.findByDoctorIdAndDateTimeBetweenOrderByDateTimeAsc(
                doctorId, day.atStartOfDay(), day.plusDays(1).atStartOfDay());
        List<SlotDto> slots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (DoctorAvailability window : windows) {
            LocalTime cursor = window.getStartTime();
            while (!cursor.plusMinutes(window.getSlotMinutes()).isAfter(window.getEndTime())) {
                LocalDateTime slotStart = LocalDateTime.of(day, cursor);
                boolean taken = dayAppointments.stream()
                        .filter(a -> a.getStatus() == AppointmentStatus.BOOKED)
                        .anyMatch(a -> a.getDateTime().equals(slotStart));
                boolean past = slotStart.isBefore(now);
                String reason = null;
                boolean available = true;
                if (!doctor.isActive()) {
                    available = false;
                    reason = "doctor_unavailable";
                } else if (onLeave) {
                    available = false;
                    reason = "leave";
                } else if (taken) {
                    available = false;
                    reason = "booked";
                } else if (past) {
                    available = false;
                    reason = "past";
                }
                slots.add(new SlotDto(slotStart, cursor.toString(), available, reason));
                cursor = cursor.plusMinutes(window.getSlotMinutes());
            }
        }
        slots.sort(Comparator.comparing(SlotDto::dateTime));
        return new AvailabilityResponse(doctor.getId(), day,
                day.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH), onLeave, slots, windowDtos);
    }

    public Map<String, Object> schedule(Long doctorId, LocalDate date) {
        Doctor doctor = get(doctorId);
        LocalDate day = date == null ? LocalDate.now() : date;
        List<Appointment> appointments = appointmentRepository
                .findByDoctorIdAndDateTimeBetweenOrderByDateTimeAsc(doctorId, day.atStartOfDay(), day.plusDays(1).atStartOfDay());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("doctor", doctor);
        result.put("date", day);
        result.put("appointments", appointments);
        result.put("summary", Map.of(
                "total", appointments.size(),
                "booked", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.BOOKED).count(),
                "completed", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count(),
                "cancelled", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count()));
        return result;
    }

    public List<DoctorLeave> leaves(Long doctorId) {
        return doctorId == null ? leaveRepository.findAllByOrderByStartDateDesc()
                : leaveRepository.findByDoctorIdOrderByStartDateDesc(doctorId);
    }

    @Transactional
    public DoctorLeave requestLeave(AuthUser user, Long doctorId, LeaveRequest request) {
        Doctor doctor = get(doctorId);
        if (!user.isAdmin() && !(user.isDoctor() && doctorId.equals(user.doctorId()))) {
            throw ApiException.forbidden("FORBIDDEN", "You can only request leave for yourself");
        }
        if (request.endDate().isBefore(request.startDate())) {
            throw ApiException.badRequest("INVALID_RANGE", "The end date cannot be before the start date");
        }
        DoctorLeave leave = leaveRepository.save(new DoctorLeave(doctor, request.startDate(),
                request.endDate(), request.reason()));
        notificationService.sendToRole(com.meridian.hms.domain.Enums.Role.ADMIN,
                "Leave request submitted",
                doctor.getUser().getName() + " requested leave from " + request.startDate()
                        + " to " + request.endDate(),
                NotificationType.SYSTEM, "/admin/leaves");
        return leave;
    }

    @Transactional
    public DoctorLeave decideLeave(Long leaveId, LeaveStatus status) {
        DoctorLeave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> ApiException.notFound("Leave request"));
        leave.setStatus(status);
        leave = leaveRepository.save(leave);
        notificationService.send(leave.getDoctor().getUser(),
                "Leave " + status.name().toLowerCase(Locale.ROOT),
                "Your leave from " + leave.getStartDate() + " to " + leave.getEndDate()
                        + " was " + status.name().toLowerCase(Locale.ROOT) + ".",
                NotificationType.SYSTEM, "/doctor/availability");
        return leave;
    }

    public boolean isOnApprovedLeave(Doctor doctor, LocalDate date) {
        return !leaveRepository.findByDoctorIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                doctor.getId(), LeaveStatus.APPROVED, date, date).isEmpty();
    }

    /** Domain check used by booking: is this doctor even supposed to work at that moment? */
    public void assertWithinAvailability(Doctor doctor, LocalDateTime start, int durationMinutes) {
        if (!doctor.isActive()) {
            throw ApiException.conflict("DOCTOR_UNAVAILABLE", "This doctor is not accepting appointments");
        }
        LocalDate day = start.toLocalDate();
        if (isOnApprovedLeave(doctor, day)) {
            throw ApiException.conflict("DOCTOR_ON_LEAVE", "The doctor is on approved leave that day");
        }
        int dayOfWeek = day.getDayOfWeek().getValue();
        List<DoctorAvailability> windows = doctor.getAvailableSlots().stream()
                .filter(w -> w.getDayOfWeek() == dayOfWeek).toList();
        if (windows.isEmpty()) {
            throw ApiException.conflict("OUTSIDE_AVAILABILITY",
                    "The doctor does not consult on " + day.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH));
        }
        LocalDateTime end = start.plusMinutes(durationMinutes);
        for (DoctorAvailability window : windows) {
            LocalDateTime windowStart = LocalDateTime.of(day, window.getStartTime());
            LocalDateTime windowEnd = LocalDateTime.of(day, window.getEndTime());
            if (!start.isBefore(windowStart) && !end.isAfter(windowEnd)) {
                long offset = Duration.between(windowStart, start).toMinutes();
                if (offset % window.getSlotMinutes() != 0) {
                    throw ApiException.conflict("INVALID_SLOT_BOUNDARY",
                            "Appointments must start on a " + window.getSlotMinutes() + "-minute boundary");
                }
                return;
            }
        }
        throw ApiException.conflict("OUTSIDE_AVAILABILITY",
                "That time is outside the doctor's consulting hours");
    }

    public List<Doctor> allActive() {
        return doctorRepository.findByActiveTrueOrderByUser_NameAsc();
    }

    @Transactional
    public void deactivate(Long id) {
        Doctor doctor = get(id);
        doctor.setActive(false);
        doctor.getUser().setActive(false);
        doctorRepository.save(doctor);
    }
}
