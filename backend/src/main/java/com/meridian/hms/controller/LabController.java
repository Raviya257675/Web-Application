package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.LabOrder;
import com.meridian.hms.domain.LabTest;
import com.meridian.hms.dto.Requests.LabCollectRequest;
import com.meridian.hms.dto.Requests.LabOrderRequest;
import com.meridian.hms.dto.Requests.LabResultRequest;
import com.meridian.hms.dto.Requests.LabTestRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.LabService;
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
@RequestMapping("/api/lab")
public class LabController {

    private final LabService labService;

    public LabController(LabService labService) {
        this.labService = labService;
    }

    @GetMapping("/tests")
    public ApiResponse<List<LabTest>> tests(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return ApiResponse.ok(labService.tests(includeInactive));
    }

    @PostMapping("/tests")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "CREATE_LAB_TEST", entity = "LabTest")
    public ApiResponse<LabTest> createTest(@Valid @RequestBody LabTestRequest request) {
        return ApiResponse.ok(labService.createTest(request));
    }

    @PatchMapping("/tests/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "UPDATE_LAB_TEST", entity = "LabTest")
    public ApiResponse<LabTest> updateTest(@PathVariable Long id, @Valid @RequestBody LabTestRequest request) {
        return ApiResponse.ok(labService.updateTest(id, request));
    }

    @PostMapping("/orders")
    @PreAuthorize("hasRole('DOCTOR')")
    @Audited(action = "ORDER_LAB_TEST", entity = "LabOrder")
    public ApiResponse<LabOrder> order(@AuthenticationPrincipal AuthUser user,
                                       @Valid @RequestBody LabOrderRequest request) {
        return ApiResponse.ok(labService.orderFor(user, request.patientId(), request.testId(),
                request.priority()));
    }

    @GetMapping("/orders")
    public ApiResponse<List<LabOrder>> orders(@AuthenticationPrincipal AuthUser user,
                                              @RequestParam(required = false) String status) {
        return ApiResponse.ok(labService.orders(user, status));
    }

    @GetMapping("/orders/{id}")
    public ApiResponse<LabOrder> order(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(labService.get(user, id));
    }

    @PatchMapping("/orders/{id}/collect")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "COLLECT_LAB_SAMPLE", entity = "LabOrder")
    public ApiResponse<LabOrder> collect(@PathVariable Long id,
                                         @RequestBody(required = false) LabCollectRequest request) {
        return ApiResponse.ok(labService.collect(id, request == null ? null : request.technician()));
    }

    @PatchMapping("/orders/{id}/result")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "ENTER_LAB_RESULT", entity = "LabOrder")
    public ApiResponse<LabOrder> result(@PathVariable Long id, @Valid @RequestBody LabResultRequest request) {
        return ApiResponse.ok(labService.complete(id, request));
    }

    @PatchMapping("/orders/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "CANCEL_LAB_ORDER", entity = "LabOrder")
    public ApiResponse<LabOrder> cancel(@PathVariable Long id) {
        return ApiResponse.ok(labService.cancel(id));
    }
}
