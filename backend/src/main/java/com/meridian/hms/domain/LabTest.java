package com.meridian.hms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "lab_tests")
@Getter
@Setter
@NoArgsConstructor
public class LabTest extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    private String sampleType;

    private String referenceRange;

    private String unit;

    private int turnaroundHours = 24;

    @Column(nullable = false)
    private boolean active = true;

    public LabTest(String code, String name, String category, BigDecimal price, String sampleType,
                   String referenceRange, String unit, int turnaroundHours) {
        this.code = code;
        this.name = name;
        this.category = category;
        this.price = price;
        this.sampleType = sampleType;
        this.referenceRange = referenceRange;
        this.unit = unit;
        this.turnaroundHours = turnaroundHours;
    }
}
