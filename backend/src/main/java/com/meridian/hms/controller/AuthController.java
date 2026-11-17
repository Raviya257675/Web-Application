package com.meridian.hms.controller;

import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.dto.Dtos.AuthResponse;
import com.meridian.hms.dto.Dtos.TokenResponse;
import com.meridian.hms.dto.Dtos.UserDto;
import com.meridian.hms.dto.Requests.ChangePasswordRequest;
import com.meridian.hms.dto.Requests.LoginRequest;
import com.meridian.hms.dto.Requests.ProfileRequest;
import com.meridian.hms.dto.Requests.RefreshRequest;
import com.meridian.hms.dto.Requests.RegisterRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.ok(null);
    }

    @GetMapping("/me")
    public ApiResponse<UserDto> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(authService.me(user));
    }

    @PatchMapping("/profile")
    public ApiResponse<UserDto> updateProfile(@AuthenticationPrincipal AuthUser user,
                                              @Valid @RequestBody ProfileRequest request) {
        return ApiResponse.ok(authService.updateProfile(user, request));
    }

    @PatchMapping("/password")
    public ApiResponse<Void> changePassword(@AuthenticationPrincipal AuthUser user,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(user, request);
        return ApiResponse.ok(null);
    }
}
