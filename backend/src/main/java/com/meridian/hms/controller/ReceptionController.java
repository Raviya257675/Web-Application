package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.*;
import com.meridian.hms.domain.*;
import com.meridian.hms.dto.Requests.*;
import com.meridian.hms.dto.RescheduleRequest;
import com.meridian.hms.repository.*;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/reception")
@PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
public class ReceptionController {
    private final PatientRepository patients;
    private final AppointmentRepository appointments;
    private final AppointmentService bookings;
    private final BillingService billing;
    private final AuthService auth;
    private final WardService wards;
    public ReceptionController(PatientRepository patients, AppointmentRepository appointments,
            AppointmentService bookings, BillingService billing, AuthService auth, WardService wards) {
        this.patients=patients; this.appointments=appointments; this.bookings=bookings;
        this.billing=billing; this.auth=auth; this.wards=wards;
    }
    // Administrative projections deliberately exclude diagnoses, allergies and clinical notes.
    private Map<String,Object> patient(Patient p) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",p.getId()); m.put("name",p.getUser().getName()); m.put("email",p.getUser().getEmail());
        m.put("phone",p.getUser().getPhone()); m.put("dob",p.getDob()); m.put("gender",p.getGender());
        m.put("address",p.getAddress()); m.put("emergencyContact",p.getEmergencyContact()); m.put("active",p.getUser().isActive());
        return m;
    }
    private Map<String,Object> appointment(Appointment a) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",a.getId()); m.put("patientId",a.getPatient().getId()); m.put("patientName",a.getPatient().getUser().getName());
        m.put("phone",a.getPatient().getUser().getPhone()); m.put("doctorId",a.getDoctor().getId()); m.put("doctorName",a.getDoctor().getUser().getName());
        m.put("dateTime",a.getDateTime()); m.put("durationMinutes",a.getDurationMinutes()); m.put("status",a.getStatus());
        m.put("tokenNumber",a.getTokenNumber()); m.put("checkedInAt",a.getCheckedInAt()); m.put("fee",a.getFee());
        return m;
    }
    private Map<String,Object> invoice(Invoice i) {
        Map<String,Object> m=new LinkedHashMap<>(); m.put("id",i.getId()); m.put("invoiceNumber",i.getInvoiceNumber());
        m.put("patientName",i.getPatient().getUser().getName()); m.put("totalAmount",i.getTotalAmount());
        m.put("amountPaid",i.getAmountPaid()); m.put("status",i.getStatus()); m.put("payments",i.getPayments()); return m;
    }
    @GetMapping("/patients")
    public ApiResponse<?> patients(@RequestParam(defaultValue="") String search) {
        String q=search.trim().toLowerCase(Locale.ROOT);
        return ApiResponse.ok(patients.findAllByOrderByCreatedAtDesc().stream()
            .filter(p -> (p.getUser().getName()+" "+p.getUser().getEmail()+" "+p.getUser().getPhone()+" "+p.getId()).toLowerCase(Locale.ROOT).contains(q))
            .limit(100).map(this::patient).toList());
    }
    @PostMapping("/patients")
    @Audited(action="REGISTER_PATIENT_AT_RECEPTION",entity="Patient")
    public ApiResponse<?> register(@Valid @RequestBody RegisterRequest r) {
        return ApiResponse.ok(auth.register(new RegisterRequest(r.name(),r.email(),r.password(),r.phone(),r.dob(),r.gender(),Enums.Role.PATIENT,null,null,null,null)));
    }
    public record Demographics(@NotBlank @Size(max=120) String name, @Size(max=40) String phone,
            @PastOrPresent LocalDate dob, @Size(max=500) String address, @Size(max=200) String emergencyContact) {}
    @PatchMapping("/patients/{id}")
    @Transactional
    @Audited(action="UPDATE_PATIENT_DEMOGRAPHICS",entity="Patient")
    public ApiResponse<?> update(@PathVariable Long id,@Valid @RequestBody Demographics r) {
        Patient p=patients.findById(id).orElseThrow(()->ApiException.notFound("Patient"));
        p.getUser().setName(r.name().trim()); p.getUser().setPhone(r.phone()); p.setDob(r.dob());
        p.setAddress(r.address()); p.setEmergencyContact(r.emergencyContact()); return ApiResponse.ok(patient(patients.save(p)));
    }
    @GetMapping("/appointments")
    public ApiResponse<?> appointments(@AuthenticationPrincipal AuthUser u,@RequestParam(required=false) LocalDate date,
            @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="1") int page) {
        var result=bookings.list(u,null,date,date,false,search,page,100);
        return ApiResponse.page(result.items().stream().map(this::appointment).toList(),result.meta());
    }
    @PostMapping("/appointments")
    @Audited(action="RECEPTION_BOOK_APPOINTMENT",entity="Appointment")
    public ApiResponse<?> book(@AuthenticationPrincipal AuthUser u,@Valid @RequestBody BookRequest r) {
        return ApiResponse.ok(appointment(bookings.book(u,r)));
    }
    @PatchMapping("/appointments/{id}/reschedule")
    @Audited(action="RECEPTION_RESCHEDULE_APPOINTMENT",entity="Appointment")
    public ApiResponse<?> reschedule(@AuthenticationPrincipal AuthUser u,@PathVariable Long id,@Valid @RequestBody RescheduleRequest r) {
        return ApiResponse.ok(appointment(bookings.reschedule(u,id,r)));
    }
    @PatchMapping("/appointments/{id}/cancel")
    @Audited(action="RECEPTION_CANCEL_APPOINTMENT",entity="Appointment")
    public ApiResponse<?> cancel(@AuthenticationPrincipal AuthUser u,@PathVariable Long id,@RequestBody CancelRequest r) {
        return ApiResponse.ok(appointment(bookings.cancel(u,id,r.reason())));
    }
    @PatchMapping("/appointments/{id}/check-in")
    @Transactional
    @Audited(action="CHECK_IN_PATIENT",entity="Appointment")
    public ApiResponse<?> checkIn(@PathVariable Long id) {
        Appointment a=appointments.findById(id).orElseThrow(()->ApiException.notFound("Appointment"));
        if(a.getStatus()!=Enums.AppointmentStatus.BOOKED || !a.getDateTime().toLocalDate().equals(LocalDate.now()))
            throw ApiException.conflict("INVALID_CHECK_IN","Only today's booked appointments can be checked in");
        if(a.getCheckedInAt()==null) a.setCheckedInAt(LocalDateTime.now());
        return ApiResponse.ok(appointment(appointments.save(a)));
    }
    @PatchMapping("/appointments/{id}/no-show")
    @Audited(action="RECEPTION_NO_SHOW",entity="Appointment")
    public ApiResponse<?> noShow(@AuthenticationPrincipal AuthUser u,@PathVariable Long id) {
        return ApiResponse.ok(appointment(bookings.markNoShow(u,id)));
    }
    @GetMapping("/billing")
    public ApiResponse<?> invoices(@AuthenticationPrincipal AuthUser u,@RequestParam(defaultValue="") String search,
            @RequestParam(required=false) String status,@RequestParam(defaultValue="1") int page) {
        var result=billing.list(u,status,search,page,100);
        return ApiResponse.page(result.items().stream().map(this::invoice).toList(),result.meta());
    }
    @PostMapping("/billing/{id}/pay")
    @Audited(action="RECEPTION_RECORD_PAYMENT",entity="Invoice")
    public ApiResponse<?> pay(@AuthenticationPrincipal AuthUser u,@PathVariable Long id,@Valid @RequestBody PaymentRequest r) {
        return ApiResponse.ok(invoice(billing.pay(u,id,r)));
    }
    @GetMapping(value="/billing/{id}/pdf",produces="application/pdf")
    public org.springframework.http.ResponseEntity<byte[]> pdf(@AuthenticationPrincipal AuthUser u,@PathVariable Long id) {
        var i=billing.get(u,id);
        return org.springframework.http.ResponseEntity.ok().header("Content-Disposition","attachment; filename="+i.getInvoiceNumber()+".pdf").body(billing.pdf(id));
    }
    @GetMapping("/beds")
    public ApiResponse<?> beds() { return ApiResponse.ok(wards.availableBeds()); }
}
