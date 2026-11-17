package com.meridian.hms.domain;

import com.meridian.hms.domain.Enums.BedStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "beds")
@Getter
@Setter
@NoArgsConstructor
public class Bed extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ward_id", nullable = false)
    private Ward ward;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal dailyCharge = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BedStatus status = BedStatus.AVAILABLE;

    public Bed(Ward ward, String code, BigDecimal dailyCharge) {
        this.ward = ward;
        this.code = code;
        this.dailyCharge = dailyCharge;
    }
}
