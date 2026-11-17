package com.meridian.hms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
public class Department extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal consultationFee = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean active = true;

    @Transient
    private long doctorCount;

    public Department(String name, String slug, String description, BigDecimal consultationFee) {
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.consultationFee = consultationFee;
    }
}
