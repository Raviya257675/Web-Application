package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiException;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.common.PageSlice;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.dto.Requests.InvoiceUpdateRequest;
import com.meridian.hms.dto.Requests.PaymentRequest;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billingService;
    private final AppointmentRepository appointmentRepository;

    public BillingController(BillingService billingService, AppointmentRepository appointmentRepository) {
        this.billingService = billingService;
        this.appointmentRepository = appointmentRepository;
    }

    @GetMapping
    public ApiResponse<List<Invoice>> list(@AuthenticationPrincipal AuthUser user,
                                           @RequestParam(required = false) String status,
                                           @RequestParam(required = false) String search,
                                           @RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "50") int limit) {
        PageSlice<Invoice> slice = billingService.list(user, status, search, page, limit);
        return ApiResponse.page(slice.items(), slice.meta());
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Object>> summary() {
        return ApiResponse.ok(billingService.summary());
    }

    @GetMapping("/patient/{patientId}")
    public ApiResponse<Map<String, Object>> forPatient(@AuthenticationPrincipal AuthUser user,
                                                       @PathVariable Long patientId) {
        return ApiResponse.ok(billingService.forPatient(user, patientId));
    }

    @PostMapping("/{appointmentId}/generate")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "GENERATE_INVOICE", entity = "Invoice")
    public ApiResponse<Invoice> generate(@PathVariable Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        if (appointment.getStatus() != com.meridian.hms.domain.Enums.AppointmentStatus.COMPLETED) {
            throw ApiException.conflict("APPOINTMENT_NOT_COMPLETED",
                    "Only a completed visit can be invoiced");
        }
        return ApiResponse.ok(billingService.generateForAppointment(appointment));
    }

    @GetMapping("/invoice/{id}")
    public ApiResponse<Invoice> invoice(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return ApiResponse.ok(billingService.get(user, id));
    }

    @GetMapping("/invoice/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        Invoice invoice = billingService.get(user, id);
        byte[] bytes = billingService.pdf(id);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(invoice.getInvoiceNumber() + ".pdf", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(bytes);
    }

    @PostMapping("/invoice/{id}/pay")
    @Audited(action = "RECORD_PAYMENT", entity = "Invoice")
    public ApiResponse<Invoice> pay(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                    @Valid @RequestBody PaymentRequest request) {
        return ApiResponse.ok(billingService.pay(user, id, request));
    }

    @PatchMapping("/invoice/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "UPDATE_INVOICE", entity = "Invoice")
    public ApiResponse<Invoice> update(@PathVariable Long id, @Valid @RequestBody InvoiceUpdateRequest request) {
        return ApiResponse.ok(billingService.updateInvoice(id, request));
    }

    @DeleteMapping("/invoice/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Audited(action = "VOID_INVOICE", entity = "Invoice")
    public ApiResponse<Invoice> voidInvoice(@PathVariable Long id) {
        return ApiResponse.ok(billingService.voidInvoice(id));
    }
}
