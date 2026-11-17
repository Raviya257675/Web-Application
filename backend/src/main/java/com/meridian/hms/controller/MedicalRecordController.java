package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.MedicalRecord;
import com.meridian.hms.domain.Prescription;
import com.meridian.hms.dto.Requests.MedicalRecordRequest;
import com.meridian.hms.dto.Requests.PrescriptionRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.MedicalRecordService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
public class MedicalRecordController {

    private final MedicalRecordService recordService;

    public MedicalRecordController(MedicalRecordService recordService) {
        this.recordService = recordService;
    }

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    @Audited(action = "CREATE_MEDICAL_RECORD", entity = "MedicalRecord")
    public ApiResponse<MedicalRecord> create(@AuthenticationPrincipal AuthUser user,
                                             @Valid @RequestBody MedicalRecordRequest request) {
        return ApiResponse.ok(recordService.create(user, request));
    }

    @GetMapping
    public ApiResponse<List<MedicalRecord>> list(@AuthenticationPrincipal AuthUser user,
                                                 @RequestParam(required = false) Long patientId) {
        return ApiResponse.ok(recordService.list(user, patientId));
    }

    @GetMapping("/patient/{patientId}")
    public ApiResponse<List<MedicalRecord>> forPatient(@AuthenticationPrincipal AuthUser user,
                                                       @PathVariable Long patientId) {
        if (user.isPatient() && !patientId.equals(user.patientId())) {
            throw com.meridian.hms.common.ApiException.forbidden("FORBIDDEN", "You can only read your own history");
        }
        return ApiResponse.ok(recordService.list(user, patientId));
    }

    @GetMapping("/{id}")
    public ApiResponse<MedicalRecord> get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(recordService.get(user, id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    @Audited(action = "UPDATE_MEDICAL_RECORD", entity = "MedicalRecord")
    public ApiResponse<MedicalRecord> update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                             @Valid @RequestBody MedicalRecordRequest request) {
        return ApiResponse.ok(recordService.update(user, id, request));
    }

    @PostMapping("/prescriptions")
    @PreAuthorize("hasRole('DOCTOR')")
    @Audited(action = "ISSUE_PRESCRIPTION", entity = "Prescription")
    public ApiResponse<Prescription> issue(@AuthenticationPrincipal AuthUser user,
                                           @Valid @RequestBody PrescriptionRequest request) {
        return ApiResponse.ok(recordService.issuePrescription(user, request));
    }

    @GetMapping("/prescriptions")
    public ApiResponse<List<Prescription>> prescriptions(@AuthenticationPrincipal AuthUser user,
                                                         @RequestParam(required = false) Long patientId) {
        return ApiResponse.ok(recordService.prescriptions(user, patientId));
    }

    @GetMapping("/prescriptions/{id}")
    public ApiResponse<Prescription> prescription(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(recordService.getPrescription(user, id));
    }
}
