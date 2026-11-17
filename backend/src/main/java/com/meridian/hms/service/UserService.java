package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.DoctorAvailability;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.User;
import com.meridian.hms.dto.Dtos.UserDto;
import com.meridian.hms.dto.Requests.StaffRequest;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public UserService(UserRepository userRepository, DoctorRepository doctorRepository,
                       PatientRepository patientRepository, DepartmentRepository departmentRepository,
                       PasswordEncoder passwordEncoder, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    public List<UserDto> list(String role, String search) {
        List<User> users = role == null || role.isBlank()
                ? userRepository.findAll()
                : userRepository.findByRoleOrderByNameAsc(Role.valueOf(role.toUpperCase(Locale.ROOT)));
        return users.stream()
                .filter(u -> search == null || search.isBlank()
                        || u.getName().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))
                        || u.getEmail().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT)))
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(u -> UserDto.of(u,
                        patientRepository.findByUserId(u.getId()).map(p -> p.getId()).orElse(null),
                        doctorRepository.findByUserId(u.getId()).map(d -> d.getId()).orElse(null)))
                .toList();
    }

    public UserDto get(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        return UserDto.of(user,
                patientRepository.findByUserId(id).map(p -> p.getId()).orElse(null),
                doctorRepository.findByUserId(id).map(d -> d.getId()).orElse(null));
    }

    /** Provisions a doctor (login + clinical profile + default weekly hours) or an admin. */
    @Transactional
    public UserDto createStaff(StaffRequest request) {
        if (request.role() == Role.PATIENT) {
            throw ApiException.badRequest("INVALID_ROLE", "This endpoint provisions staff only; patients self-register");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with that email already exists");
        }
        User user = new User(request.name().trim(), request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()), request.role(), request.phone());
        user = userRepository.save(user);

        Long doctorId = null;
        if (request.role() == Role.DOCTOR) {
            if (request.departmentId() == null) {
                throw ApiException.badRequest("DEPARTMENT_REQUIRED", "Choose a department for the doctor");
            }
            Department department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> ApiException.notFound("Department"));
            Doctor doctor = new Doctor(user,
                    request.specialization() == null || request.specialization().isBlank()
                            ? department.getName() : request.specialization(),
                    department,
                    request.consultationFee() == null ? department.getConsultationFee() : request.consultationFee());
            doctor.setLicenseNo(request.licenseNo());
            doctor.setExperienceYears(request.experienceYears());
            doctor.setBio(request.bio());
            for (int day = 1; day <= 5; day++) {
                doctor.getAvailableSlots().add(new DoctorAvailability(doctor, day,
                        LocalTime.of(9, 0), LocalTime.of(13, 0), 30));
            }
            doctor = doctorRepository.save(doctor);
            doctorId = doctor.getId();
        }

        notificationService.send(user, "Your Meridian account is ready",
                "An administrator created your " + request.role().name().toLowerCase(Locale.ROOT)
                        + " account. Use your email address to sign in.",
                com.meridian.hms.domain.Enums.NotificationType.SYSTEM, null);
        return UserDto.of(user, null, doctorId);
    }

    @Transactional
    public UserDto setStatus(Long id, boolean active) {
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        if (!"APPROVED".equals(user.getApprovalStatus())) throw ApiException.conflict("REVIEW_REQUIRED", "Review this staff application before granting access");
        if (!active && user.getRole() == Role.ADMIN && userRepository.findByRoleOrderByNameAsc(Role.ADMIN).stream().filter(User::isActive).count() <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "Keep at least one active administrator");
        }
        user.setActive(active);
        userRepository.save(user);
        doctorRepository.findByUserId(id).ifPresent(doctor -> {
            doctor.setActive(active);
            doctorRepository.save(doctor);
        });
        return UserDto.of(user,
                patientRepository.findByUserId(id).map(p -> p.getId()).orElse(null),
                doctorRepository.findByUserId(id).map(d -> d.getId()).orElse(null));
    }

    @Transactional
    public UserDto review(Long id, boolean approve, String note, com.meridian.hms.security.AuthUser actor) {
        User user = userRepository.lockById(id).orElseThrow(() -> ApiException.notFound("Application"));
        if (!"PENDING".equals(user.getApprovalStatus())) throw ApiException.conflict("ALREADY_REVIEWED", "This application has already been reviewed");
        if (id.equals(actor.userId())) throw ApiException.forbidden("SELF_APPROVAL", "You cannot approve your own application");
        if (!approve && (note == null || note.isBlank())) throw ApiException.badRequest("REASON_REQUIRED", "Give a reason for rejection");
        user.setApprovalStatus(approve ? "APPROVED" : "REJECTED");
        user.setActive(approve);
        user.setReviewNote(note);
        user.setReviewedBy(actor.email());
        user.setReviewedAt(java.time.LocalDateTime.now());
        doctorRepository.findByUserId(id).ifPresent(d -> { d.setActive(approve); doctorRepository.save(d); });
        userRepository.save(user);
        notificationService.send(user, approve ? "Staff access approved" : "Staff application reviewed",
                approve ? "You can now sign in to your staff workspace. Doctors should publish their availability before accepting appointments." : "Please contact hospital administration regarding your application.",
                com.meridian.hms.domain.Enums.NotificationType.SYSTEM, null);
        return get(id);
    }

    public long countByRole(Role role) {
        return userRepository.countByRole(role);
    }

    public BigDecimal doctorFee(User user) {
        return doctorRepository.findByUserId(user.getId()).map(Doctor::getConsultationFee).orElse(BigDecimal.ZERO);
    }
}
