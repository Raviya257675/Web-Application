package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Admission;
import com.meridian.hms.domain.Bed;
import com.meridian.hms.domain.Ward;
import com.meridian.hms.dto.Requests.AdmissionRequest;
import com.meridian.hms.dto.Requests.BedRequest;
import com.meridian.hms.dto.Requests.BedStatusRequest;
import com.meridian.hms.dto.Requests.DischargeRequest;
import com.meridian.hms.dto.Requests.WardRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.WardService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/wards")
public class WardController {

    private final WardService wardService;

    public WardController(WardService wardService) {
        this.wardService = wardService;
    }

    @GetMapping
    public ApiResponse<List<Ward>> wards(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return ApiResponse.ok(wardService.wards(includeInactive));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "CREATE_WARD", entity = "Ward")
    public ApiResponse<Ward> createWard(@Valid @RequestBody WardRequest request) {
        return ApiResponse.ok(wardService.createWard(request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "UPDATE_WARD", entity = "Ward")
    public ApiResponse<Ward> updateWard(@PathVariable Long id, @Valid @RequestBody WardRequest request) {
        return ApiResponse.ok(wardService.updateWard(id, request));
    }

    @GetMapping("/{id}/beds")
    public ApiResponse<List<Bed>> beds(@PathVariable Long id) {
        return ApiResponse.ok(wardService.beds(id));
    }

    @PostMapping("/{id}/beds")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "CREATE_BED", entity = "Bed")
    public ApiResponse<Bed> addBed(@PathVariable Long id, @Valid @RequestBody BedRequest request) {
        return ApiResponse.ok(wardService.addBed(id, request));
    }

    @GetMapping("/beds/available")
    public ApiResponse<List<Bed>> availableBeds() {
        return ApiResponse.ok(wardService.availableBeds());
    }

    @PatchMapping("/beds/{bedId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "UPDATE_BED", entity = "Bed")
    public ApiResponse<Bed> updateBed(@PathVariable Long bedId, @Valid @RequestBody BedRequest request) {
        return ApiResponse.ok(wardService.updateBed(bedId, request));
    }

    @PatchMapping("/beds/{bedId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "SET_BED_STATUS", entity = "Bed")
    public ApiResponse<Bed> setBedStatus(@PathVariable Long bedId, @Valid @RequestBody BedStatusRequest request) {
        return ApiResponse.ok(wardService.setBedStatus(bedId, request.status()));
    }

    @GetMapping("/admissions")
    public ApiResponse<List<Admission>> admissions(@AuthenticationPrincipal AuthUser user,
                                                   @RequestParam(required = false) String status) {
        return ApiResponse.ok(wardService.admissions(user, status));
    }

    @PostMapping("/admissions")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    @Audited(action = "ADMIT_PATIENT", entity = "Admission")
    public ApiResponse<Admission> admit(@AuthenticationPrincipal AuthUser user,
                                        @Valid @RequestBody AdmissionRequest request) {
        return ApiResponse.ok(wardService.admit(user, request));
    }

    @GetMapping("/admissions/{id}")
    public ApiResponse<Admission> admission(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(wardService.getAdmission(user, id));
    }

    @PostMapping("/admissions/{id}/discharge")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    @Audited(action = "DISCHARGE_PATIENT", entity = "Admission")
    public ApiResponse<Map<String, Object>> discharge(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                                      @RequestBody(required = false) DischargeRequest request) {
        return ApiResponse.ok(wardService.discharge(user, id, request == null ? null : request.notes()));
    }

    @GetMapping("/occupancy")
    public ApiResponse<Map<String, Object>> occupancy() {
        return ApiResponse.ok(wardService.occupancy());
    }
}
