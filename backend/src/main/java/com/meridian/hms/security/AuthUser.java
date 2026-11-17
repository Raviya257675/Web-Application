package com.meridian.hms.security;

import com.meridian.hms.domain.Enums.Role;

/** The authenticated principal attached to every request. */
public record AuthUser(Long userId, String name, String email, Role role, Long patientId, Long doctorId) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public boolean isDoctor() {
        return role == Role.DOCTOR;
    }

    public boolean isPatient() {
        return role == Role.PATIENT;
    }

    public boolean isReceptionist() { return role == Role.RECEPTIONIST; }
    public boolean isPharmacist() { return role == Role.PHARMACIST; }
}
