package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Admission;
import com.meridian.hms.domain.Bed;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.Enums.AdmissionStatus;
import com.meridian.hms.domain.Enums.BedStatus;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.domain.Ward;
import com.meridian.hms.dto.Requests.AdmissionRequest;
import com.meridian.hms.dto.Requests.BedRequest;
import com.meridian.hms.dto.Requests.WardRequest;
import com.meridian.hms.repository.AdmissionRepository;
import com.meridian.hms.repository.BedRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.repository.WardRepository;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WardService {

    private final WardRepository wardRepository;
    private final BedRepository bedRepository;
    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BillingService billingService;
    private final NotificationService notificationService;

    public WardService(WardRepository wardRepository, BedRepository bedRepository,
                       AdmissionRepository admissionRepository, PatientRepository patientRepository,
                       DoctorRepository doctorRepository, BillingService billingService,
                       NotificationService notificationService) {
        this.wardRepository = wardRepository;
        this.bedRepository = bedRepository;
        this.admissionRepository = admissionRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.billingService = billingService;
        this.notificationService = notificationService;
    }

    // ------------------------------------------------------------------ wards

    public List<Ward> wards(boolean includeInactive) {
        List<Ward> wards = includeInactive ? wardRepository.findAllByOrderByNameAsc()
                : wardRepository.findByActiveTrueOrderByNameAsc();
        wards.forEach(w -> {
            w.setTotalBeds(bedRepository.countByWardId(w.getId()));
            w.setOccupiedBeds(bedRepository.countByWardIdAndStatus(w.getId(), BedStatus.OCCUPIED));
        });
        return wards;
    }

    @Transactional
    public Ward createWard(WardRequest request) {
        if (wardRepository.findByNameIgnoreCase(request.name().trim()).isPresent()) {
            throw ApiException.conflict("WARD_EXISTS", "A ward with that name already exists");
        }
        Ward ward = new Ward(request.name().trim(), request.type(), request.floor(), request.description());
        if (request.active() != null) ward.setActive(request.active());
        return wardRepository.save(ward);
    }

    @Transactional
    public Ward updateWard(Long id, WardRequest request) {
        Ward ward = wardRepository.findById(id).orElseThrow(() -> ApiException.notFound("Ward"));
        ward.setName(request.name().trim());
        if (request.type() != null) ward.setType(request.type());
        if (request.floor() != null) ward.setFloor(request.floor());
        if (request.description() != null) ward.setDescription(request.description());
        if (request.active() != null) ward.setActive(request.active());
        return wardRepository.save(ward);
    }

    // ------------------------------------------------------------------- beds

    public List<Bed> beds(Long wardId) {
        return bedRepository.findByWardIdOrderByCodeAsc(wardId);
    }

    @Transactional
    public Bed addBed(Long wardId, BedRequest request) {
        Ward ward = wardRepository.findById(wardId).orElseThrow(() -> ApiException.notFound("Ward"));
        for (Bed existing : bedRepository.findByWardIdOrderByCodeAsc(wardId)) {
            if (existing.getCode().equalsIgnoreCase(request.code().trim())) {
                throw ApiException.conflict("BED_EXISTS", "That bed code already exists in this ward");
            }
        }
        return bedRepository.save(new Bed(ward, request.code().trim().toUpperCase(), request.dailyCharge()));
    }

    @Transactional
    public Bed updateBed(Long bedId, BedRequest request) {
        Bed bed = bedRepository.findById(bedId).orElseThrow(() -> ApiException.notFound("Bed"));
        bed.setCode(request.code().trim().toUpperCase());
        bed.setDailyCharge(request.dailyCharge());
        return bedRepository.save(bed);
    }

    @Transactional
    public Bed setBedStatus(Long bedId, BedStatus status) {
        Bed bed = bedRepository.findById(bedId).orElseThrow(() -> ApiException.notFound("Bed"));
        if (bed.getStatus() == BedStatus.OCCUPIED && status != BedStatus.OCCUPIED) {
            throw ApiException.conflict("BED_OCCUPIED", "Discharge the patient before changing this bed's status");
        }
        bed.setStatus(status);
        return bedRepository.save(bed);
    }

    // -------------------------------------------------------------- admissions

    public List<Admission> admissions(AuthUser user, String status) {
        List<Admission> admissions;
        if (user.isAdmin()) {
            admissions = admissionRepository.findAllByOrderByAdmittedAtDesc();
        } else if (user.isDoctor()) {
            admissions = admissionRepository.findAllByOrderByAdmittedAtDesc().stream()
                    .filter(a -> a.getDoctor().getId().equals(user.doctorId())).toList();
        } else {
            admissions = admissionRepository.findByPatientIdOrderByAdmittedAtDesc(user.patientId());
        }
        if (status != null && !status.isBlank()) {
            AdmissionStatus wanted = AdmissionStatus.valueOf(status.toUpperCase());
            admissions = admissions.stream().filter(a -> a.getStatus() == wanted).toList();
        }
        return admissions;
    }

    public Admission getAdmission(AuthUser user, Long id) {
        Admission admission = admissionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Admission"));
        if (user.isAdmin()
                || (user.isDoctor() && admission.getDoctor().getId().equals(user.doctorId()))
                || (user.isPatient() && admission.getPatient().getId().equals(user.patientId()))) {
            return admission;
        }
        throw ApiException.forbidden("ADMISSION_ACCESS_DENIED", "This admission is not yours");
    }

    @Transactional
    public Admission admit(AuthUser user, AdmissionRequest request) {
        if (!user.isAdmin() && !user.isDoctor()) {
            throw ApiException.forbidden("FORBIDDEN", "Only clinical staff can admit a patient");
        }
        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> ApiException.notFound("Patient"));
        Bed bed = bedRepository.findById(request.bedId()).orElseThrow(() -> ApiException.notFound("Bed"));
        Doctor doctor;
        if (user.isDoctor()) {
            doctor = doctorRepository.findById(user.doctorId())
                    .orElseThrow(() -> ApiException.notFound("Doctor profile"));
        } else {
            doctor = doctorRepository.findById(request.doctorId())
                    .orElseThrow(() -> ApiException.notFound("Doctor"));
        }
        if (bed.getStatus() == BedStatus.OCCUPIED) {
            throw ApiException.conflict("BED_OCCUPIED", "That bed is already occupied");
        }
        if (bed.getStatus() == BedStatus.MAINTENANCE) {
            throw ApiException.conflict("BED_UNAVAILABLE", "That bed is under maintenance");
        }
        admissionRepository.findByBedIdAndStatus(bed.getId(), AdmissionStatus.ADMITTED)
                .ifPresent(a -> {
                    throw ApiException.conflict("BED_OCCUPIED", "That bed already has an active admission");
                });

        bed.setStatus(BedStatus.OCCUPIED);
        bedRepository.save(bed);

        Admission admission = new Admission(patient, doctor, bed, request.diagnosis(), request.notes());
        admission = admissionRepository.save(admission);

        notificationService.send(patient.getUser(), "Admitted to hospital",
                "You have been admitted to " + bed.getWard().getName() + ", bed " + bed.getCode()
                        + ". Treating doctor: " + doctor.getUser().getName() + ".",
                NotificationType.ADMISSION, "/patient/admissions");
        return admission;
    }

    @Transactional
    public Map<String, Object> discharge(AuthUser user, Long id, String notes) {
        Admission admission = getAdmission(user, id);
        if (admission.getStatus() != AdmissionStatus.ADMITTED) {
            throw ApiException.conflict("ALREADY_DISCHARGED", "This patient has already been discharged");
        }
        LocalDateTime now = LocalDateTime.now();
        int nights = (int) Math.max(1, ChronoUnit.DAYS.between(
                admission.getAdmittedAt().toLocalDate(), now.toLocalDate()));
        admission.setDischargedAt(now);
        admission.setStatus(AdmissionStatus.DISCHARGED);
        if (notes != null && !notes.isBlank()) {
            admission.setNotes((admission.getNotes() == null ? "" : admission.getNotes() + " | ") + notes);
        }
        admission = admissionRepository.save(admission);

        Bed bed = admission.getBed();
        bed.setStatus(BedStatus.AVAILABLE);
        bedRepository.save(bed);

        Invoice invoice = billingService.createForAdmission(admission, nights,
                admission.getDoctor().getConsultationFee());

        notificationService.send(admission.getPatient().getUser(), "Discharged",
                "You were discharged from " + bed.getWard().getName() + ". The final invoice "
                        + invoice.getInvoiceNumber() + " is ready.",
                NotificationType.ADMISSION, "/patient/invoices");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("admission", admission);
        result.put("nights", nights);
        result.put("invoice", invoice);
        return result;
    }

    public Map<String, Object> occupancy() {
        long total = bedRepository.count();
        long occupied = bedRepository.countByStatus(BedStatus.OCCUPIED);
        long maintenance = bedRepository.countByStatus(BedStatus.MAINTENANCE);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBeds", total);
        result.put("occupiedBeds", occupied);
        result.put("availableBeds", total - occupied - maintenance);
        result.put("maintenanceBeds", maintenance);
        result.put("occupancyRate", total == 0 ? 0 : Math.round(occupied * 1000.0 / total) / 10.0);
        result.put("activeAdmissions", admissionRepository.countByStatus(AdmissionStatus.ADMITTED));
        result.put("wards", wards(false));
        return result;
    }

    public List<Bed> availableBeds() {
        return bedRepository.findByStatusOrderByWard_NameAscCodeAsc(BedStatus.AVAILABLE);
    }

    public long activeAdmissions() {
        return admissionRepository.countByStatus(AdmissionStatus.ADMITTED);
    }

    public LocalDate today() {
        return LocalDate.now();
    }
}
