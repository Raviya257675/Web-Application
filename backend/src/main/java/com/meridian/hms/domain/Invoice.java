package com.meridian.hms.domain;

import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Enums.PaymentMethod;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
public class Invoice extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "appointment_id", unique = true)
    private Appointment appointment;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "admission_id", unique = true)
    private Admission admission;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "invoice_items", joinColumns = @JoinColumn(name = "invoice_id"))
    @OrderColumn(name = "line_no")
    private List<InvoiceItem> items = new ArrayList<>();

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subTotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status = InvoiceStatus.PENDING;

    private LocalDate dueDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "invoice_payments", joinColumns = @JoinColumn(name = "invoice_id"))
    @OrderColumn(name = "line_no")
    private List<Payment> payments = new ArrayList<>();

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class InvoiceItem {
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;

        public InvoiceItem(String description, Integer quantity, BigDecimal unitPrice, BigDecimal amount) {
            this.description = description;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.amount = amount;
        }
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Payment {
        private BigDecimal amount;

        @Enumerated(EnumType.STRING)
        private PaymentMethod method;

        private String reference;

        private LocalDateTime paidAt;

        private String receivedBy;

        public Payment(BigDecimal amount, PaymentMethod method, String reference, LocalDateTime paidAt, String receivedBy) {
            this.amount = amount;
            this.method = method;
            this.reference = reference;
            this.paidAt = paidAt;
            this.receivedBy = receivedBy;
        }
    }
}
