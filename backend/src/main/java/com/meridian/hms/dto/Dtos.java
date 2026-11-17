package com.meridian.hms.dto;

import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.User;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class Dtos {

    private Dtos() {
    }

    public record UserDto(Long id, String name, String email, Role role, String phone,
                          boolean active, Long patientId, Long doctorId, LocalDateTime createdAt,
                          String approvalStatus, String professionalLicense, String applicationNote,
                          String reviewNote, String reviewedBy, LocalDateTime reviewedAt) {

        public static UserDto of(User user, Long patientId, Long doctorId) {
            return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                    user.getPhone(), user.isActive(), patientId, doctorId, user.getCreatedAt(),
                    user.getApprovalStatus(), user.getProfessionalLicense(), user.getApplicationNote(),
                    user.getReviewNote(), user.getReviewedBy(), user.getReviewedAt());
        }
    }

    public record AuthResponse(UserDto user, String accessToken, String refreshToken) {
    }

    public record TokenResponse(String accessToken) {
    }

    public record SlotDto(LocalDateTime dateTime, String label, boolean available, String reason) {
    }

    public record WindowDto(int dayOfWeek, String startTime, String endTime, int slotMinutes) {
    }

    public record AvailabilityResponse(Long doctorId, LocalDate date, String dayOfWeek, boolean onLeave,
                                       List<SlotDto> slots, List<WindowDto> windows) {
    }
}
