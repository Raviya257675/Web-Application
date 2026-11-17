package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.MedicalRecord;
import com.meridian.hms.domain.Prescription;
import com.meridian.hms.domain.Prescription.PrescriptionItem;
import com.meridian.hms.dto.Requests.MedicalRecordRequest;
import com.meridian.hms.dto.Requests.PrescriptionItemRequest;
import com.meridian.hms.dto.Requests.PrescriptionRequest;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.MedicalRecordRepository;
import com.meridian.hms.repository.PrescriptionRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class MedicalRecordService {

    private final MedicalRecordRepository recordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final AppointmentRepository appointmentRepository;
    private final LabService labService;
    private final NotificationService notificationService;
    private final AccessControl accessControl;

    public MedicalRecordService(MedicalRecordRepository recordRepository, PrescriptionRepository prescriptionRepository,
                                AppointmentRepository appointmentRepository, LabService labService,
                                NotificationService notificationService, AccessControl accessControl) {
        this.recordRepository = recordRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.appointmentRepository = appointmentRepository;
        this.labService = labService;
        this.notificationService = notificationService;
        this.accessControl = accessControl;
    }

    @Transactional
    public MedicalRecord create(AuthUser user, MedicalRecordRequest request) {
        if (!user.isDoctor()) {
            throw ApiException.forbidden("FORBIDDEN", "Only the treating doctor can write a clinical record");
        }
        Appointment appointment = appointmentRepository.findById(request.appointmentId())
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        accessControl.assertDoctorOwnsAppointment(user, appointment);
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw ApiException.conflict("APPOINTMENT_NOT_COMPLETED",
                    "Complete the visit before writing its clinical record");
        }
        if (recordRepository.existsByAppointmentId(appointment.getId())) {
            throw ApiException.conflict("RECORD_EXISTS", "This visit already has a clinical record");
        }

        MedicalRecord record = new MedicalRecord();
        record.setAppointment(appointment);
        record.setPatient(appointment.getPatient());
        record.setDoctor(appointment.getDoctor());
        applyFields(record, request);
        record = recordRepository.save(record);

        if (request.prescription() != null && !request.prescription().isEmpty()) {
            Prescription prescription = new Prescription();
            prescription.setMedicalRecord(record);
            prescription.setPatient(record.getPatient());
            prescription.setDoctor(record.getDoctor());
            prescription.setAdvice(request.advice());
            prescription.setItems(mapItems(request.prescription()));
            record.setPrescription(prescriptionRepository.save(prescription));
            record = recordRepository.save(record);
        }

        if (request.labTestIds() != null && !request.labTestIds().isEmpty()) {
            for (Long testId : request.labTestIds()) {
                labService.createOrder(user, appointment.getPatient().getId(), testId, appointment.getId(), null);
            }
        }

        notificationService.send(record.getPatient().getUser(), "Clinical summary available",
                "Your visit summary" + (record.getPrescription() == null ? "" : " and prescription")
                        + " from " + record.getDoctor().getUser().getName() + " is ready to read.",
                NotificationType.SYSTEM, "/patient/records");
        return record;
    }

    private void applyFields(MedicalRecord record, MedicalRecordRequest request) {
        record.setDiagnosis(request.diagnosis());
        record.setSymptoms(request.symptoms());
        record.setBloodPressure(request.bloodPressure());
        record.setPulse(request.pulse());
        record.setTemperature(request.temperature());
        record.setWeight(request.weight());
        record.setHeight(request.height());
        record.setSpo2(request.spo2());
        record.setNotes(request.notes());
        record.setFollowUpDate(request.followUpDate());
        record.setUpdatedAt(LocalDateTime.now());
    }

    private List<PrescriptionItem> mapItems(List<PrescriptionItemRequest> items) {
        List<PrescriptionItem> mapped = new ArrayList<>();
        for (PrescriptionItemRequest item : items) {
            PrescriptionItem pi = new PrescriptionItem();
            pi.setMedicineName(item.medicineName());
            pi.setDosage(item.dosage());
            pi.setFrequency(item.frequency());
            pi.setDurationDays(item.durationDays());
            pi.setQuantity(item.quantity());
            pi.setInstructions(item.instructions());
            mapped.add(pi);
        }
        return mapped;
    }

    public List<MedicalRecord> list(AuthUser user, Long patientId) {
        List<MedicalRecord> records;
        if (user.isAdmin()) {
            records = patientId == null ? recordRepository.findAllByOrderByCreatedAtDesc()
                    : recordRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        } else if (user.isDoctor()) {
            records = patientId == null ? recordRepository.findByDoctorIdOrderByCreatedAtDesc(user.doctorId())
                    : recordRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
            if (patientId != null) {
                records = records.stream().filter(r -> r.getDoctor().getId().equals(user.doctorId())).toList();
            }
        } else {
            records = recordRepository.findByPatientIdOrderByCreatedAtDesc(user.patientId());
        }
        return records;
    }

    public MedicalRecord get(AuthUser user, Long id) {
        MedicalRecord record = recordRepository.findById(id).orElseThrow(() -> ApiException.notFound("Medical record"));
        accessControl.assertCanAccessRecord(user, record);
        return record;
    }

    @Transactional
    public MedicalRecord update(AuthUser user, Long id, MedicalRecordRequest request) {
        MedicalRecord record = get(user, id);
        if (!user.isDoctor() || !record.getDoctor().getId().equals(user.doctorId())) {
            throw ApiException.forbidden("FORBIDDEN", "Only the authoring doctor can amend this record");
        }
        applyFields(record, request);
        if (record.getPrescription() != null && request.prescription() != null) {
            record.getPrescription().setAdvice(request.advice());
            record.getPrescription().getItems().clear();
            record.getPrescription().getItems().addAll(mapItems(request.prescription()));
        }
        return recordRepository.save(record);
    }

    @Transactional
    public Prescription issuePrescription(AuthUser user, PrescriptionRequest request) {
        if (!user.isDoctor()) {
            throw ApiException.forbidden("FORBIDDEN", "Only a doctor can issue a prescription");
        }
        MedicalRecord record = recordRepository.findById(request.medicalRecordId())
                .orElseThrow(() -> ApiException.notFound("Medical record"));
        if (!record.getDoctor().getId().equals(user.doctorId())) {
            throw ApiException.forbidden("FORBIDDEN", "That record belongs to another doctor");
        }
        Prescription prescription = record.getPrescription();
        if (prescription == null) {
            prescription = new Prescription();
            prescription.setMedicalRecord(record);
            prescription.setPatient(record.getPatient());
            prescription.setDoctor(record.getDoctor());
        }
        prescription.setAdvice(request.advice());
        prescription.getItems().clear();
        prescription.getItems().addAll(mapItems(request.items()));
        return prescriptionRepository.save(prescription);
    }

    public List<Prescription> prescriptions(AuthUser user, Long patientId) {
        if (user.isAdmin() || user.isPharmacist()) {
            return patientId == null ? prescriptionRepository.findAllByOrderByCreatedAtDesc()
                    : prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        }
        if (user.isDoctor()) {
            return prescriptionRepository.findByDoctorIdOrderByCreatedAtDesc(user.doctorId());
        }
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(user.patientId());
    }

    public Prescription getPrescription(AuthUser user, Long id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Prescription"));
        if (user.isAdmin() || user.isPharmacist()) {
            return prescription;
        }
        if (user.isPatient() && prescription.getPatient().getId().equals(user.patientId())) {
            return prescription;
        }
        if (user.isDoctor() && prescription.getDoctor().getId().equals(user.doctorId())) {
            return prescription;
        }
        throw ApiException.forbidden("PRESCRIPTION_ACCESS_DENIED", "This prescription is not yours");
    }

    public MedicalRecord forAppointment(Long appointmentId) {
        return recordRepository.findByAppointmentId(appointmentId).orElse(null);
    }
}
