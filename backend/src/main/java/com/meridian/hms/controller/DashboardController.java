package com.meridian.hms.controller;

import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.common.ApiException;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> dashboard(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(switch (user.role()) {
            case ADMIN -> dashboardService.admin();
            case DOCTOR -> dashboardService.doctor(user);
            case PATIENT -> dashboardService.patient(user);
            case RECEPTIONIST -> dashboardService.receptionist();
            case PHARMACIST -> dashboardService.pharmacist();
            default -> throw ApiException.forbidden("FORBIDDEN", "Unknown role");
        });
    }
}
