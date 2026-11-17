package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.domain.User;
import com.meridian.hms.dto.Requests.PatientUpdateRequest;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.InvoiceRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final AccessControl accessControl;

    public PatientService(PatientRepository patientRepository, AppointmentRepository appointmentRepository,
                          InvoiceRepository invoiceRepository, AccessControl accessControl) {
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.invoiceRepository = invoiceRepository;
        this.accessControl = accessControl;
    }

    /** Admin: everyone. Doctor: only patients they have seen. Patient: themselves. */
    public List<Patient> list(AuthUser user, String search) {
        List<Patient> patients;
        if (user.isAdmin()) {
            patients = patientRepository.findAllByOrderByCreatedAtDesc();
        } else if (user.isDoctor()) {
            Map<Long, Patient> seen = new LinkedHashMap<>();
            appointmentRepository.findByDoctorIdOrderByDateTimeAsc(user.doctorId())
                    .forEach(a -> seen.putIfAbsent(a.getPatient().getId(), a.getPatient()));
            patients = List.copyOf(seen.values());
        } else {
            patients = List.of(accessControl.currentPatient(user));
        }
        if (search != null && !search.isBlank()) {
            String needle = search.toLowerCase(Locale.ROOT);
            patients = patients.stream().filter(p ->
                    p.getUser().getName().toLowerCase(Locale.ROOT).contains(needle)
                            || p.getUser().getEmail().toLowerCase(Locale.ROOT).contains(needle)).toList();
        }
        return patients;
    }

    public Patient get(AuthUser user, Long id) {
        Patient patient = patientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Patient"));
        accessControl.assertCanAccessPatient(user, patient);
        return patient;
    }

    public Map<String, Object> me(AuthUser user) {
        Patient patient = accessControl.currentPatient(user);
        List<Appointment> appointments = appointmentRepository.findByPatientIdOrderByDateTimeDesc(patient.getId());
        List<Invoice> invoices = invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        BigDecimal outstanding = invoices.stream()
                .filter(i -> i.getStatus() != InvoiceStatus.VOID)
                .map(i -> i.getTotalAmount().subtract(i.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("patient", patient);
        result.put("totalVisits", appointmentRepository.countByPatientId(patient.getId()));
        result.put("upcoming",
                appointmentRepository.findByPatientIdAndStatusOrderByDateTimeDesc(patient.getId(), AppointmentStatus.BOOKED)
                        .stream().filter(a -> a.getDateTime().isAfter(java.time.LocalDateTime.now())).count());
        result.put("outstanding", outstanding);
        result.put("invoices", invoices.size());
        return result;
    }

    @Transactional
    public Patient update(AuthUser user, Long id, PatientUpdateRequest request) {
        Patient patient = patientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Patient"));
        boolean self = user.isPatient() && id.equals(user.patientId());
        if (!user.isAdmin() && !self) {
            throw ApiException.forbidden("FORBIDDEN", "You can only edit your own profile");
        }
        if (request.dob() != null) patient.setDob(request.dob());
        if (request.gender() != null) patient.setGender(request.gender());
        if (request.bloodGroup() != null) patient.setBloodGroup(request.bloodGroup());
        if (request.address() != null) patient.setAddress(request.address());
        if (request.allergies() != null) patient.setAllergies(request.allergies());
        if (request.emergencyContact() != null) patient.setEmergencyContact(request.emergencyContact());
        if (request.insuranceProvider() != null) patient.setInsuranceProvider(request.insuranceProvider());
        if (request.insuranceNumber() != null) patient.setInsuranceNumber(request.insuranceNumber());
        User account = patient.getUser();
        if (request.name() != null && !request.name().isBlank()) account.setName(request.name().trim());
        if (request.phone() != null) account.setPhone(request.phone());
        return patientRepository.save(patient);
    }

    @Transactional
    public void deactivate(Long id) {
        Patient patient = patientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Patient"));
        patient.getUser().setActive(false);
        patientRepository.save(patient);
    }

    public long count() {
        return patientRepository.count();
    }
}
