package com.meridian.hms.security;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.MedicalRecord;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.PatientRepository;
import org.springframework.stereotype.Component;

/**
 * Layer-two access control: "is this particular record one of theirs?".
 * Roles gate whole endpoints; ownership is checked here against the loaded row.
 */
@Component
public class AccessControl {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;

    public AccessControl(PatientRepository patientRepository, DoctorRepository doctorRepository,
                         AppointmentRepository appointmentRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
    }

    public void requireAdmin(AuthUser user) {
        if (!user.isAdmin()) {
            throw ApiException.forbidden("FORBIDDEN", "Administrator access is required");
        }
    }

    public void requireDoctor(AuthUser user) {
        if (!user.isDoctor()) {
            throw ApiException.forbidden("FORBIDDEN", "Doctor access is required");
        }
    }

    public Patient currentPatient(AuthUser user) {
        if (!user.isPatient() || user.patientId() == null) {
            throw ApiException.forbidden("FORBIDDEN", "A patient profile is required");
        }
        return patientRepository.findById(user.patientId())
                .orElseThrow(() -> ApiException.notFound("Patient profile"));
    }

    public Doctor currentDoctor(AuthUser user) {
        if (!user.isDoctor() || user.doctorId() == null) {
            throw ApiException.forbidden("FORBIDDEN", "A doctor profile is required");
        }
        return doctorRepository.findById(user.doctorId())
                .orElseThrow(() -> ApiException.notFound("Doctor profile"));
    }

    public void assertCanAccessPatient(AuthUser user, Patient patient) {
        if (user.isAdmin()) {
            return;
        }
        if (user.isPatient() && patient.getId().equals(user.patientId())) {
            return;
        }
        if (user.isDoctor() && user.doctorId() != null
                && appointmentRepository.existsByPatientIdAndDoctorId(patient.getId(), user.doctorId())) {
            return;
        }
        throw ApiException.forbidden("PATIENT_ACCESS_DENIED",
                "You do not have a treatment relationship with this patient");
    }

    public void assertCanAccessRecord(AuthUser user, MedicalRecord record) {
        if (user.isAdmin()) {
            return;
        }
        if (user.isPatient() && record.getPatient().getId().equals(user.patientId())) {
            return;
        }
        if (user.isDoctor() && record.getDoctor().getId().equals(user.doctorId())) {
            return;
        }
        throw ApiException.forbidden("RECORD_ACCESS_DENIED", "This medical record is not yours");
    }

    public void assertDoctorOwnsAppointment(AuthUser user, Appointment appointment) {
        if (user.isAdmin()) {
            return;
        }
        if (!user.isDoctor() || !appointment.getDoctor().getId().equals(user.doctorId())) {
            throw ApiException.forbidden("APPOINTMENT_ACCESS_DENIED", "This appointment belongs to another doctor");
        }
    }

    public void assertCanAccessAppointment(AuthUser user, Appointment appointment) {
        if (user.isAdmin() || user.isReceptionist()) {
            return;
        }
        if (user.isPatient() && appointment.getPatient().getId().equals(user.patientId())) {
            return;
        }
        if (user.isDoctor() && appointment.getDoctor().getId().equals(user.doctorId())) {
            return;
        }
        throw ApiException.forbidden("APPOINTMENT_ACCESS_DENIED", "This appointment is not yours");
    }
}
