package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.common.PageSlice;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.dto.Requests.BookRequest;
import com.meridian.hms.dto.Requests.CancelRequest;
import com.meridian.hms.dto.Requests.CompleteRequest;
import com.meridian.hms.dto.RescheduleRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    @Audited(action = "BOOK_APPOINTMENT", entity = "Appointment")
    public ApiResponse<Appointment> book(@AuthenticationPrincipal AuthUser user,
                                         @Valid @RequestBody BookRequest request) {
        return ApiResponse.ok(appointmentService.book(user, request));
    }

    @GetMapping
    public ApiResponse<java.util.List<Appointment>> list(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "false") boolean upcoming,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {
        PageSlice<Appointment> slice = appointmentService.list(user, status, from, to, upcoming, search, page, limit);
        return ApiResponse.page(slice.items(), slice.meta());
    }

    @GetMapping("/me")
    public ApiResponse<java.util.List<Appointment>> mine(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean upcoming,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {
        PageSlice<Appointment> slice = appointmentService.list(user, status, null, null, upcoming, null, page, limit);
        return ApiResponse.page(slice.items(), slice.meta());
    }

    @GetMapping("/{id}")
    public ApiResponse<Appointment> get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(appointmentService.get(user, id));
    }

    @PatchMapping("/{id}/cancel")
    @Audited(action = "CANCEL_APPOINTMENT", entity = "Appointment")
    public ApiResponse<Appointment> cancel(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                           @RequestBody(required = false) CancelRequest request) {
        return ApiResponse.ok(appointmentService.cancel(user, id, request == null ? null : request.reason()));
    }

    @PatchMapping("/{id}/reschedule")
    @Audited(action = "RESCHEDULE_APPOINTMENT", entity = "Appointment")
    public ApiResponse<Appointment> reschedule(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                               @Valid @RequestBody RescheduleRequest request) {
        return ApiResponse.ok(appointmentService.reschedule(user, id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "DELETE_APPOINTMENT", entity = "Appointment")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        appointmentService.delete(id);
        return ApiResponse.ok(null);
    }

    @PatchMapping("/{id}/complete")
    @Audited(action = "COMPLETE_APPOINTMENT", entity = "Appointment")
    public ApiResponse<Map<String, Object>> complete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                                     @RequestBody(required = false) CompleteRequest request) {
        return ApiResponse.ok(appointmentService.complete(user, id, request == null ? null : request.notes()));
    }

    @PatchMapping("/{id}/no-show")
    @Audited(action = "MARK_NO_SHOW", entity = "Appointment")
    public ApiResponse<Appointment> noShow(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(appointmentService.markNoShow(user, id));
    }
}
