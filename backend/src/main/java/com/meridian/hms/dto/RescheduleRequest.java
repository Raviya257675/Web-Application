package com.meridian.hms.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/** Request body for moving an existing appointment to a new slot. */
public record RescheduleRequest(
        @NotNull @Future LocalDateTime dateTime,
        Integer durationMinutes) {
}
