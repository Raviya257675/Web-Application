package com.meridian.hms.controller;

import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Notification;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<List<Notification>> list(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(notificationService.list(user.userId()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unread(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(Map.of("count", notificationService.unreadCount(user.userId())));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Notification> markRead(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(notificationService.markRead(user.userId(), id));
    }

    @PostMapping("/read-all")
    public ApiResponse<Map<String, Integer>> markAllRead(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(Map.of("updated", notificationService.markAllRead(user.userId())));
    }
}
