package com.meridian.hms.controller;

import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.AuditLog;
import com.meridian.hms.service.AuditService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public ApiResponse<List<AuditLog>> list(@RequestParam(required = false) String action,
                                            @RequestParam(required = false) String entity,
                                            @RequestParam(required = false) String actor,
                                            @RequestParam(defaultValue = "200") int limit) {
        return ApiResponse.ok(auditService.list(action, entity, actor, limit));
    }
}
