package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.dto.Requests.DepartmentRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.DepartmentService;
import jakarta.validation.Valid;
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

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public ApiResponse<List<Department>> list(@AuthenticationPrincipal AuthUser user,
                                              @RequestParam(defaultValue = "false") boolean includeInactive) {
        boolean admin = user != null && user.role() == Role.ADMIN;
        return ApiResponse.ok(departmentService.list(includeInactive && admin));
    }

    @GetMapping("/{id}")
    public ApiResponse<Department> get(@PathVariable Long id) {
        return ApiResponse.ok(departmentService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "CREATE_DEPARTMENT", entity = "Department")
    public ApiResponse<Department> create(@Valid @RequestBody DepartmentRequest request) {
        return ApiResponse.ok(departmentService.create(request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "UPDATE_DEPARTMENT", entity = "Department")
    public ApiResponse<Department> update(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        return ApiResponse.ok(departmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "DELETE_DEPARTMENT", entity = "Department")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ApiResponse.ok(null);
    }
}
