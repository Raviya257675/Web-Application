package com.meridian.hms.domain;

import com.meridian.hms.domain.Enums.StockMovementType;
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

@Entity
@Table(name = "stock_movements")
@Getter
@Setter
@NoArgsConstructor
public class StockMovement extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockMovementType type;

    @Column(nullable = false)
    private int quantity;

    private String reason;

    private String reference;

    private String createdBy;

    public StockMovement(Medicine medicine, StockMovementType type, int quantity, String reason,
                         String reference, String createdBy) {
        this.medicine = medicine;
        this.type = type;
        this.quantity = quantity;
        this.reason = reason;
        this.reference = reference;
        this.createdBy = createdBy;
    }
}
