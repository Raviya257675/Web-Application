package com.meridian.hms.domain;

import com.meridian.hms.domain.Enums.Gender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.Period;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
public class Patient extends BaseEntity {

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private String bloodGroup;

    private String address;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    private String emergencyContact;

    private String insuranceProvider;

    private String insuranceNumber;

    @Transient
    public Integer getAge() {
        return dob == null ? null : Period.between(dob, LocalDate.now()).getYears();
    }

    public Patient(User user) {
        this.user = user;
    }
}
