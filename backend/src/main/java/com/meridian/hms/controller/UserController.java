package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.dto.Dtos.UserDto;
import com.meridian.hms.dto.Requests.StaffRequest;
import com.meridian.hms.dto.Requests.StatusRequest;
import com.meridian.hms.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public record ReviewRequest(boolean approve, @jakarta.validation.constraints.Size(max = 1000) String note) {}

    @PatchMapping("/{id}/review")
    @Audited(action = "REVIEW_STAFF_APPLICATION", entity = "User")
    public ApiResponse<UserDto> review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.meridian.hms.security.AuthUser actor) {
        return ApiResponse.ok(userService.review(id, request.approve(), request.note(), actor));
    }

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<UserDto>> list(@RequestParam(required = false) String role,
                                           @RequestParam(required = false) String search) {
        return ApiResponse.ok(userService.list(role, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserDto> get(@PathVariable Long id) {
        return ApiResponse.ok(userService.get(id));
    }

    @PostMapping("/staff")
    @Audited(action = "CREATE_STAFF", entity = "User")
    public ApiResponse<UserDto> createStaff(@Valid @RequestBody StaffRequest request) {
        return ApiResponse.ok(userService.createStaff(request));
    }

    @PatchMapping("/{id}/status")
    @Audited(action = "SET_ACCOUNT_STATUS", entity = "User")
    public ApiResponse<UserDto> setStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        return ApiResponse.ok(userService.setStatus(id, request.active()));
    }
}
