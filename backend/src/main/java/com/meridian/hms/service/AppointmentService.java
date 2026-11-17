package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.common.PageSlice;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.dto.Requests.BookRequest;
import com.meridian.hms.dto.RescheduleRequest;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.InvoiceRepository;
import com.meridian.hms.repository.MedicalRecordRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AppointmentService {

    private static final DateTimeFormatter HUMAN = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final InvoiceRepository invoiceRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DoctorService doctorService;
    private final BillingService billingService;
    private final NotificationService notificationService;
    private final AccessControl accessControl;
    private final int cancellationWindowHours;

    public AppointmentService(AppointmentRepository appointmentRepository, PatientRepository patientRepository,
                              InvoiceRepository invoiceRepository, MedicalRecordRepository medicalRecordRepository,
                              DoctorService doctorService,
                              BillingService billingService, NotificationService notificationService,
                              AccessControl accessControl,
                              @Value("${app.cancellation-window-hours}") int cancellationWindowHours) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.invoiceRepository = invoiceRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.doctorService = doctorService;
        this.billingService = billingService;
        this.notificationService = notificationService;
        this.accessControl = accessControl;
        this.cancellationWindowHours = cancellationWindowHours;
    }

    // ------------------------------------------------------------------ book

    @Transactional
    public Appointment book(AuthUser user, BookRequest request) {
        Patient patient;
        if (user.isPatient()) {
            patient = accessControl.currentPatient(user);
            if (request.patientId() != null && !request.patientId().equals(patient.getId())) {
                throw ApiException.forbidden("FORBIDDEN", "You can only book for yourself");
            }
        } else if (user.isAdmin() || user.isReceptionist()) {
            if (request.patientId() == null) {
                throw ApiException.badRequest("PATIENT_REQUIRED", "Choose a patient for this booking");
            }
            patient = patientRepository.findById(request.patientId())
                    .orElseThrow(() -> ApiException.notFound("Patient"));
        } else {
            throw ApiException.forbidden("FORBIDDEN", "Doctors cannot create bookings");
        }

        Doctor doctor = doctorService.get(request.doctorId());
        int duration = request.durationMinutes() == null ? 30 : request.durationMinutes();
        LocalDateTime start = request.dateTime().withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(duration);

        // 1. future
        if (start.isBefore(LocalDateTime.now())) {
            throw ApiException.conflict("SLOT_IN_PAST", "That slot is already in the past");
        }
        // 2-5. doctor exists, active, not on leave, inside a published window, on the slot grid
        doctorService.assertWithinAvailability(doctor, start, duration);

        // 6. doctor double-booking
        List<Appointment> doctorDay = appointmentRepository.findByDoctorIdAndDateTimeBetweenOrderByDateTimeAsc(
                doctor.getId(), start.toLocalDate().atStartOfDay(), start.toLocalDate().plusDays(1).atStartOfDay());
        boolean doctorClash = doctorDay.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED)
                .anyMatch(a -> overlaps(a.getDateTime(), a.getDateTime().plusMinutes(a.getDurationMinutes()), start, end));
        if (doctorClash) {
            throw ApiException.conflict("DOCTOR_DOUBLE_BOOKED", "That doctor already has an appointment at this time");
        }

        // 7. patient double-booking with anyone
        List<Appointment> patientDay = appointmentRepository.findByPatientIdAndDateTimeBetweenOrderByDateTimeAsc(
                patient.getId(), start.toLocalDate().atStartOfDay(), start.toLocalDate().plusDays(1).atStartOfDay());
        boolean patientClash = patientDay.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED)
                .anyMatch(a -> overlaps(a.getDateTime(), a.getDateTime().plusMinutes(a.getDurationMinutes()), start, end));
        if (patientClash) {
            throw ApiException.conflict("PATIENT_DOUBLE_BOOKED", "You already have another appointment at this time");
        }

        Appointment appointment = new Appointment(patient, doctor, start, duration, request.reason());
        appointment.setFee(doctor.getConsultationFee());
        appointment.setTokenNumber(nextToken(doctorDay));
        appointment = appointmentRepository.save(appointment);

        notificationService.send(patient.getUser(), "Appointment confirmed",
                "Your visit with " + doctor.getUser().getName() + " is booked for " + start.format(HUMAN)
                        + ". Your token is #" + appointment.getTokenNumber() + ".",
                NotificationType.APPOINTMENT, "/patient/appointments");
        notificationService.send(doctor.getUser(), "New appointment",
                patient.getUser().getName() + " booked for " + start.format(HUMAN) + ".",
                NotificationType.APPOINTMENT, "/doctor");
        return appointment;
    }

    // ------------------------------------------------------------ reschedule

    /**
     * Moves a booked appointment to a new slot. Runs the same conflict checks as
     * booking, but excludes the appointment being moved from both clash queries.
     */
    @Transactional
    public Appointment reschedule(AuthUser user, Long id, RescheduleRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        accessControl.assertCanAccessAppointment(user, appointment);
        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw ApiException.conflict("NOT_RESCHEDULABLE", "Only a booked appointment can be moved");
        }
        if (user.isPatient()) {
            LocalDateTime cutoff = appointment.getDateTime().minusHours(cancellationWindowHours);
            if (LocalDateTime.now().isAfter(cutoff)) {
                throw ApiException.conflict("RESCHEDULE_WINDOW_CLOSED",
                        "Appointments can only be moved " + cancellationWindowHours + " hours in advance");
            }
        }

        Doctor doctor = appointment.getDoctor();
        int duration = request.durationMinutes() == null
                ? appointment.getDurationMinutes() : request.durationMinutes();
        LocalDateTime start = request.dateTime().withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(duration);

        if (start.isBefore(LocalDateTime.now())) {
            throw ApiException.conflict("SLOT_IN_PAST", "That slot is already in the past");
        }
        doctorService.assertWithinAvailability(doctor, start, duration);

        final Long movedId = appointment.getId();
        List<Appointment> doctorDay = appointmentRepository.findByDoctorIdAndDateTimeBetweenOrderByDateTimeAsc(
                doctor.getId(), start.toLocalDate().atStartOfDay(), start.toLocalDate().plusDays(1).atStartOfDay());
        boolean doctorClash = doctorDay.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED)
                .filter(a -> !a.getId().equals(movedId))
                .anyMatch(a -> overlaps(a.getDateTime(), a.getDateTime().plusMinutes(a.getDurationMinutes()), start, end));
        if (doctorClash) {
            throw ApiException.conflict("DOCTOR_DOUBLE_BOOKED", "That doctor already has an appointment at this time");
        }

        List<Appointment> patientDay = appointmentRepository.findByPatientIdAndDateTimeBetweenOrderByDateTimeAsc(
                appointment.getPatient().getId(), start.toLocalDate().atStartOfDay(),
                start.toLocalDate().plusDays(1).atStartOfDay());
        boolean patientClash = patientDay.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED)
                .filter(a -> !a.getId().equals(movedId))
                .anyMatch(a -> overlaps(a.getDateTime(), a.getDateTime().plusMinutes(a.getDurationMinutes()), start, end));
        if (patientClash) {
            throw ApiException.conflict("PATIENT_DOUBLE_BOOKED", "The patient already has another appointment at this time");
        }

        boolean newDay = !appointment.getDateTime().toLocalDate().equals(start.toLocalDate());
        appointment.setDateTime(start);
        appointment.setCheckedInAt(null);
        appointment.setDurationMinutes(duration);
        appointment.setUpdatedAt(LocalDateTime.now());
        if (newDay) {
            long existing = doctorDay.stream()
                    .filter(a -> !a.getId().equals(movedId)).count();
            appointment.setTokenNumber((int) existing + 1);
        }
        appointment = appointmentRepository.save(appointment);

        notificationService.send(appointment.getPatient().getUser(), "Appointment moved",
                "Your visit with " + doctor.getUser().getName() + " is now on " + start.format(HUMAN)
                        + ". Token #" + appointment.getTokenNumber() + ".",
                NotificationType.APPOINTMENT, "/patient/appointments");
        notificationService.send(doctor.getUser(), "Appointment moved",
                appointment.getPatient().getUser().getName() + "'s visit moved to " + start.format(HUMAN) + ".",
                NotificationType.APPOINTMENT, "/doctor");
        return appointment;
    }

    private boolean overlaps(LocalDateTime aStart, LocalDateTime aEnd, LocalDateTime bStart, LocalDateTime bEnd) {
        return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
    }

    private int nextToken(List<Appointment> day) {
        return day.stream().map(Appointment::getTokenNumber).filter(java.util.Objects::nonNull)
                .max(Integer::compareTo).orElse(0) + 1;
    }

    // ----------------------------------------------------------------- lists

    public PageSlice<Appointment> list(AuthUser user, String status, LocalDate from, LocalDate to,
                                       boolean upcoming, String search, int page, int limit) {
        List<Appointment> appointments;
        if (user.isAdmin() || user.isReceptionist()) {
            appointments = appointmentRepository.findAll();
        } else if (user.isDoctor()) {
            appointments = appointmentRepository.findByDoctorIdOrderByDateTimeAsc(user.doctorId());
        } else {
            appointments = appointmentRepository.findByPatientIdOrderByDateTimeDesc(accessControl.currentPatient(user).getId());
        }

        List<Appointment> filtered = new ArrayList<>(appointments);
        if (status != null && !status.isBlank()) {
            AppointmentStatus wanted = AppointmentStatus.valueOf(status.toUpperCase(Locale.ROOT));
            filtered.removeIf(a -> a.getStatus() != wanted);
        }
        if (from != null) {
            filtered.removeIf(a -> a.getDateTime().toLocalDate().isBefore(from));
        }
        if (to != null) {
            filtered.removeIf(a -> a.getDateTime().toLocalDate().isAfter(to));
        }
        if (upcoming) {
            LocalDateTime now = LocalDateTime.now();
            filtered.removeIf(a -> a.getDateTime().isBefore(now) || a.getStatus() != AppointmentStatus.BOOKED);
        }
        if (search != null && !search.isBlank()) {
            String needle = search.toLowerCase(Locale.ROOT);
            filtered.removeIf(a -> !(a.getPatient().getUser().getName().toLowerCase(Locale.ROOT).contains(needle)
                    || a.getDoctor().getUser().getName().toLowerCase(Locale.ROOT).contains(needle)
                    || (a.getReason() != null && a.getReason().toLowerCase(Locale.ROOT).contains(needle))));
        }
        filtered.sort(Comparator.comparing(Appointment::getDateTime).reversed());
        return PageSlice.of(filtered, page, limit);
    }

    public Appointment get(AuthUser user, Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        accessControl.assertCanAccessAppointment(user, appointment);
        return appointment;
    }

    public Map<String, Object> daySheet(Long doctorId, LocalDate date) {
        return doctorService.schedule(doctorId, date);
    }

    // -------------------------------------------------------------- lifecycle

    @Transactional
    public Appointment cancel(AuthUser user, Long id, String reason) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        accessControl.assertCanAccessAppointment(user, appointment);
        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw ApiException.conflict("NOT_CANCELLABLE", "Only a booked appointment can be cancelled");
        }
        if (user.isPatient()) {
            LocalDateTime cutoff = appointment.getDateTime().minusHours(cancellationWindowHours);
            if (LocalDateTime.now().isAfter(cutoff)) {
                throw ApiException.conflict("CANCELLATION_WINDOW_CLOSED",
                        "Appointments can only be cancelled " + cancellationWindowHours + " hours in advance");
            }
        }
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setUpdatedAt(LocalDateTime.now());
        if (reason != null && !reason.isBlank()) {
            appointment.setNotes(reason);
        }
        appointment = appointmentRepository.save(appointment);

        invoiceRepository.findByAppointmentId(id).ifPresent(invoice -> {
            if (invoice.getAmountPaid().signum() == 0 && invoice.getStatus() != InvoiceStatus.VOID) {
                billingService.voidQuietly(invoice);
            }
        });

        notificationService.send(appointment.getPatient().getUser(), "Appointment cancelled",
                "Your visit with " + appointment.getDoctor().getUser().getName() + " on "
                        + appointment.getDateTime().format(HUMAN) + " was cancelled.",
                NotificationType.APPOINTMENT, "/patient/appointments");
        notificationService.send(appointment.getDoctor().getUser(), "Appointment cancelled",
                appointment.getPatient().getUser().getName() + "'s visit on "
                        + appointment.getDateTime().format(HUMAN) + " was cancelled.",
                NotificationType.APPOINTMENT, "/doctor");
        return appointment;
    }

    @Transactional
    public Map<String, Object> complete(AuthUser user, Long id, String notes) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        accessControl.assertDoctorOwnsAppointment(user, appointment);
        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw ApiException.conflict("NOT_COMPLETABLE", "Only a booked appointment can be completed");
        }
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setUpdatedAt(LocalDateTime.now());
        if (notes != null && !notes.isBlank()) {
            appointment.setNotes(notes);
        }
        appointment = appointmentRepository.save(appointment);
        Invoice invoice = billingService.generateForAppointment(appointment);

        notificationService.send(appointment.getPatient().getUser(), "Visit completed",
                "Your visit with " + appointment.getDoctor().getUser().getName()
                        + " is complete. The consultation summary and invoice are ready.",
                NotificationType.BILLING, "/patient/invoices");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("appointment", appointment);
        result.put("invoice", invoice);
        return result;
    }

    @Transactional
    public Appointment markNoShow(AuthUser user, Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        if (!user.isReceptionist()) accessControl.assertDoctorOwnsAppointment(user, appointment);
        if (appointment.getDateTime().isAfter(LocalDateTime.now())) throw ApiException.conflict("TOO_EARLY", "A future appointment cannot be marked as a no-show");
        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw ApiException.conflict("NOT_BOOKED", "Only a booked appointment can be marked as a no-show");
        }
        appointment.setStatus(AppointmentStatus.NO_SHOW);
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    /**
     * Safe hard delete for closed appointments. A booked visit must be cancelled
     * first, and anything with clinical or billing history is kept for audit.
     */
    @Transactional
    public void delete(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Appointment"));
        if (appointment.getStatus() == AppointmentStatus.BOOKED) {
            throw ApiException.conflict("APPOINTMENT_STILL_BOOKED",
                    "Cancel the appointment before deleting it");
        }
        if (medicalRecordRepository.existsByAppointmentId(id)) {
            throw ApiException.conflict("APPOINTMENT_HAS_RECORD",
                    "This visit has a clinical record and cannot be deleted");
        }
        if (invoiceRepository.findByAppointmentId(id).isPresent()) {
            throw ApiException.conflict("APPOINTMENT_HAS_INVOICE",
                    "This visit has an invoice and cannot be deleted");
        }
        appointmentRepository.delete(appointment);
    }

    public long todayCount() {
        LocalDate today = LocalDate.now();
        return appointmentRepository.countByStatusAndDateTimeBetween(AppointmentStatus.BOOKED,
                today.atStartOfDay(), today.plusDays(1).atStartOfDay());
    }
}
