package com.meridian.hms.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dispenses")
@Getter
@Setter
@NoArgsConstructor
public class Dispense extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "prescription_id")
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    private String dispensedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "dispense_items", joinColumns = @JoinColumn(name = "dispense_id"))
    @OrderColumn(name = "line_no")
    private List<DispenseItem> items = new ArrayList<>();

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class DispenseItem {
        private String medicineName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;

        public DispenseItem(String medicineName, Integer quantity, BigDecimal unitPrice, BigDecimal amount) {
            this.medicineName = medicineName;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.amount = amount;
        }
    }
}
