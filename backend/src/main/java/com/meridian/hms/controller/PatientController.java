package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.dto.Requests.PatientUpdateRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping
    public ApiResponse<List<Patient>> list(@AuthenticationPrincipal AuthUser user,
                                           @RequestParam(required = false) String search) {
        return ApiResponse.ok(patientService.list(user, search));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ApiResponse<Map<String, Object>> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(patientService.me(user));
    }

    @GetMapping("/{id}")
    public ApiResponse<Patient> get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(patientService.get(user, id));
    }

    @PatchMapping("/{id}")
    @Audited(action = "UPDATE_PATIENT", entity = "Patient")
    public ApiResponse<Patient> update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                       @Valid @RequestBody PatientUpdateRequest request) {
        return ApiResponse.ok(patientService.update(user, id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "DEACTIVATE_PATIENT", entity = "Patient")
    public ApiResponse<Void> deactivate(@PathVariable Long id) {
        patientService.deactivate(id);
        return ApiResponse.ok(null);
    }
}
