package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.domain.User;
import com.meridian.hms.dto.Dtos.AuthResponse;
import com.meridian.hms.dto.Dtos.TokenResponse;
import com.meridian.hms.dto.Dtos.UserDto;
import com.meridian.hms.dto.Requests.ChangePasswordRequest;
import com.meridian.hms.dto.Requests.LoginRequest;
import com.meridian.hms.dto.Requests.ProfileRequest;
import com.meridian.hms.dto.Requests.RegisterRequest;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.repository.UserRepository;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final NotificationService notificationService;
    private final com.meridian.hms.repository.DepartmentRepository departments;

    public AuthService(UserRepository userRepository, PatientRepository patientRepository,
                       DoctorRepository doctorRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, NotificationService notificationService,
                       com.meridian.hms.repository.DepartmentRepository departments) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.notificationService = notificationService;
        this.departments = departments;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email().trim())) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with that email already exists");
        }
        Role role = request.role() == null ? Role.PATIENT : request.role();
        if ((role == Role.DOCTOR || role == Role.PHARMACIST)
                && (request.professionalLicense() == null || request.professionalLicense().isBlank())) {
            throw ApiException.badRequest("LICENSE_REQUIRED", "Enter your professional registration number for verification");
        }
        User user = new User(request.name().trim(), request.email().trim().toLowerCase(java.util.Locale.ROOT),
                passwordEncoder.encode(request.password()), role, request.phone());
        boolean immediateAccess = role == Role.PATIENT || role == Role.ADMIN;
        user.setActive(immediateAccess);
        user.setApprovalStatus(immediateAccess ? "APPROVED" : "PENDING");
        user.setProfessionalLicense(request.professionalLicense());
        user.setApplicationNote(request.applicationNote());
        user = userRepository.save(user);

        if (role != Role.PATIENT) {
            Long doctorId = null;
            if (role == Role.DOCTOR) {
                if (request.departmentId() == null) throw ApiException.badRequest("DEPARTMENT_REQUIRED", "Choose your hospital department");
                var department = departments.findById(request.departmentId())
                        .filter(com.meridian.hms.domain.Department::isActive)
                        .orElseThrow(() -> ApiException.badRequest("DEPARTMENT_REQUIRED", "Choose an active hospital department"));
                var doctor = new com.meridian.hms.domain.Doctor(user,
                        request.specialization() == null || request.specialization().isBlank() ? department.getName() : request.specialization().trim(),
                        department, department.getConsultationFee());
                doctor.setActive(false);
                doctor.setLicenseNo(request.professionalLicense());
                doctorId = doctorRepository.save(doctor).getId();
            }
            if (role != Role.ADMIN) notificationService.sendToRole(Role.ADMIN, "Staff application awaiting review",
                    user.getName() + " applied as " + role.name() + ". Verify their details before approving access.",
                    com.meridian.hms.domain.Enums.NotificationType.SYSTEM, "/admin/staff");
            return UserDto.of(user, null, doctorId);
        }

        Patient patient = new Patient(user);
        patient.setDob(request.dob());
        patient.setGender(request.gender());
        patient = patientRepository.save(patient);

        notificationService.send(user, "Welcome to Meridian",
                "Your patient portal is ready. Book your first appointment from the dashboard.",
                com.meridian.hms.domain.Enums.NotificationType.SYSTEM, "/patient/book");

        return UserDto.of(user, patient.getId(), null);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect");
        }
        if (!user.isActive()) {
            if ("PENDING".equals(user.getApprovalStatus())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "APPROVAL_PENDING", "Your staff application is awaiting hospital administrator approval.");
            }
            if ("REJECTED".equals(user.getApprovalStatus())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "APPLICATION_REJECTED", "Your staff application was not approved. Contact the hospital administrator.");
            }
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED",
                    "This account has been deactivated. Contact the administrator.");
        }
        Long patientId = patientRepository.findByUserId(user.getId()).map(Patient::getId).orElse(null);
        Long doctorId = doctorRepository.findByUserId(user.getId()).map(d -> d.getId()).orElse(null);
        return issueTokens(user, patientId, doctorId);
    }

    public TokenResponse refresh(String refreshToken) {
        try {
            Claims claims = jwtService.parse(refreshToken);
            if (!jwtService.isRefreshToken(claims)) {
                throw ApiException.unauthorized("REFRESH_INVALID", "That is not a refresh token");
            }
            User user = userRepository.findById(Long.valueOf(claims.getSubject()))
                    .filter(User::isActive)
                    .orElseThrow(() -> ApiException.unauthorized("REFRESH_INVALID", "Session is no longer valid"));
            return new TokenResponse(jwtService.generateAccessToken(user.getId(), user.getRole().name()));
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.unauthorized("REFRESH_INVALID", "Your session has expired, please sign in again");
        }
    }

    public UserDto me(AuthUser principal) {
        User user = userRepository.findById(principal.userId())
                .orElseThrow(() -> ApiException.notFound("Account"));
        return UserDto.of(user, principal.patientId(), principal.doctorId());
    }

    @Transactional
    public UserDto updateProfile(AuthUser principal, ProfileRequest request) {
        User user = userRepository.findById(principal.userId()).orElseThrow(() -> ApiException.notFound("Account"));
        user.setName(request.name().trim());
        user.setPhone(request.phone());
        userRepository.save(user);
        return UserDto.of(user, principal.patientId(), principal.doctorId());
    }

    @Transactional
    public void changePassword(AuthUser principal, ChangePasswordRequest request) {
        User user = userRepository.findById(principal.userId()).orElseThrow(() -> ApiException.notFound("Account"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("PASSWORD_MISMATCH", "Your current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private AuthResponse issueTokens(User user, Long patientId, Long doctorId) {
        String access = jwtService.generateAccessToken(user.getId(), user.getRole().name());
        String refresh = jwtService.generateRefreshToken(user.getId());
        return new AuthResponse(UserDto.of(user, patientId, doctorId), access, refresh);
    }

    public User requireUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Account"));
    }

    public List<User> admins() {
        return userRepository.findByRoleOrderByNameAsc(Role.ADMIN);
    }
}
