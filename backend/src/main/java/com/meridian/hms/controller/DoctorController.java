package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiException;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.DoctorAvailability;
import com.meridian.hms.domain.DoctorLeave;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.dto.Dtos.AvailabilityResponse;
import com.meridian.hms.dto.Requests.AvailabilityRequest;
import com.meridian.hms.dto.Requests.DoctorUpdateRequest;
import com.meridian.hms.dto.Requests.LeaveDecisionRequest;
import com.meridian.hms.dto.Requests.LeaveRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping
    public ApiResponse<List<Doctor>> list(@AuthenticationPrincipal AuthUser user,
                                          @RequestParam(required = false) Long departmentId,
                                          @RequestParam(required = false) String search,
                                          @RequestParam(defaultValue = "false") boolean includeInactive) {
        boolean admin = user != null && user.role() == Role.ADMIN;
        return ApiResponse.ok(doctorService.list(departmentId, search, includeInactive && admin));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public ApiResponse<Doctor> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(doctorService.me(user));
    }

    @GetMapping("/{id}")
    public ApiResponse<Doctor> get(@PathVariable Long id) {
        return ApiResponse.ok(doctorService.get(id));
    }

    @GetMapping("/{id}/availability")
    public ApiResponse<AvailabilityResponse> availability(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(doctorService.availability(id, date));
    }

    @GetMapping("/{id}/schedule")
    public ApiResponse<Map<String, Object>> schedule(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                                     @RequestParam(required = false)
                                                     @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (!user.isAdmin() && !(user.isDoctor() && id.equals(user.doctorId()))) {
            throw ApiException.forbidden("FORBIDDEN", "You can only view your own schedule");
        }
        return ApiResponse.ok(doctorService.schedule(id, date));
    }

    @PatchMapping("/{id}")
    @Audited(action = "UPDATE_DOCTOR", entity = "Doctor")
    public ApiResponse<Doctor> update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                      @Valid @RequestBody DoctorUpdateRequest request) {
        return ApiResponse.ok(doctorService.update(user, id, request));
    }

    @PatchMapping("/{id}/availability")
    @Audited(action = "SET_AVAILABILITY", entity = "Doctor")
    public ApiResponse<List<DoctorAvailability>> setAvailability(@AuthenticationPrincipal AuthUser user,
                                                                 @PathVariable Long id,
                                                                 @Valid @RequestBody AvailabilityRequest request) {
        return ApiResponse.ok(doctorService.setAvailability(user, id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "DEACTIVATE_DOCTOR", entity = "Doctor")
    public ApiResponse<Void> deactivate(@PathVariable Long id) {
        doctorService.deactivate(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/leaves")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<DoctorLeave>> allLeaves() {
        return ApiResponse.ok(doctorService.leaves(null));
    }

    @GetMapping("/{id}/leaves")
    public ApiResponse<List<DoctorLeave>> leaves(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        if (!user.isAdmin() && !(user.isDoctor() && id.equals(user.doctorId()))) {
            throw ApiException.forbidden("FORBIDDEN", "You can only view your own leave requests");
        }
        return ApiResponse.ok(doctorService.leaves(id));
    }

    @PostMapping("/{id}/leaves")
    @Audited(action = "REQUEST_LEAVE", entity = "DoctorLeave")
    public ApiResponse<DoctorLeave> requestLeave(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                                 @Valid @RequestBody LeaveRequest request) {
        return ApiResponse.ok(doctorService.requestLeave(user, id, request));
    }

    @PatchMapping("/leaves/{leaveId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "DECIDE_LEAVE", entity = "DoctorLeave")
    public ApiResponse<DoctorLeave> decideLeave(@PathVariable Long leaveId,
                                                @Valid @RequestBody LeaveDecisionRequest request) {
        return ApiResponse.ok(doctorService.decideLeave(leaveId, request.status()));
    }
}
