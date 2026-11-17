package com.meridian.hms.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "stock_batches")
@Getter
@Setter
@NoArgsConstructor
public class StockBatch extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(nullable = false)
    private String batchNo;

    private LocalDate expiryDate;

    @Column(nullable = false)
    private int quantity;

    public StockBatch(Medicine medicine, String batchNo, LocalDate expiryDate, int quantity) {
        this.medicine = medicine;
        this.batchNo = batchNo;
        this.expiryDate = expiryDate;
        this.quantity = quantity;
    }
}
