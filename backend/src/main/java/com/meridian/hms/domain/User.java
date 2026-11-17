package com.meridian.hms.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.meridian.hms.domain.Enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
public class User extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, length = 20)
    @org.hibernate.annotations.ColumnDefault("'APPROVED'")
    private String approvalStatus = "APPROVED";

    private String professionalLicense;

    @Column(length = 1000)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String applicationNote;

    @Column(length = 1000)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String reviewNote;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String reviewedBy;
    private java.time.LocalDateTime reviewedAt;

    public User(String name, String email, String passwordHash, Role role, String phone) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.phone = phone;
    }
}
