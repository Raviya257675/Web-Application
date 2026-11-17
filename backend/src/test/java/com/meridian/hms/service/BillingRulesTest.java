package com.meridian.hms.service;

import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.repository.InvoiceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
class BillingRulesTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private com.meridian.hms.security.AccessControl accessControl;
    @Mock
    private BillingPdfService billingPdfService;

    private BillingService service() {
        return new BillingService(invoiceRepository, notificationService, accessControl,
                billingPdfService, new BigDecimal("0.05"), 14);
    }

    @Test
    void derivesStatusFromMoneyReceived() {
        BillingService service = service();
        BigDecimal total = new BigDecimal("1000.00");

        assertEquals(InvoiceStatus.PENDING, service.deriveStatus(total, BigDecimal.ZERO));
        assertEquals(InvoiceStatus.PARTIALLY_PAID, service.deriveStatus(total, new BigDecimal("400.00")));
        assertEquals(InvoiceStatus.PAID, service.deriveStatus(total, new BigDecimal("1000.00")));
        assertEquals(InvoiceStatus.PAID, service.deriveStatus(total, new BigDecimal("1200.00")));
    }

    @Test
    void appliesDiscountBeforeTaxAndRoundsToTwoDecimals() {
        Invoice invoice = new Invoice();
        invoice.getItems().add(new Invoice.InvoiceItem("Consultation", 1,
                new BigDecimal("4500.00"), new BigDecimal("4500.00")));
        invoice.getItems().add(new Invoice.InvoiceItem("Dressing", 2,
                new BigDecimal("125.55"), new BigDecimal("251.10")));
        invoice.setDiscount(new BigDecimal("250.00"));

        service().recalculate(invoice);

        assertEquals(new BigDecimal("4751.10"), invoice.getSubTotal());
        assertEquals(new BigDecimal("250.00"), invoice.getDiscount());
        assertEquals(new BigDecimal("225.06"), invoice.getTaxAmount());
        assertEquals(new BigDecimal("4726.16"), invoice.getTotalAmount());
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
    }

    @Test
    void capsDiscountAtSubtotal() {
        Invoice invoice = new Invoice();
        invoice.getItems().add(new Invoice.InvoiceItem("Consultation", 1,
                new BigDecimal("1000.00"), new BigDecimal("1000.00")));
        invoice.setDiscount(new BigDecimal("5000.00"));

        service().recalculate(invoice);

        assertEquals(new BigDecimal("1000.00"), invoice.getDiscount());
        assertEquals(new BigDecimal("0.00"), invoice.getTotalAmount());
    }
}
