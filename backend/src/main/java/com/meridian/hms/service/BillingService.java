package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.common.PageSlice;
import com.meridian.hms.domain.Admission;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.dto.Requests.InvoiceItemRequest;
import com.meridian.hms.dto.Requests.InvoiceUpdateRequest;
import com.meridian.hms.dto.Requests.PaymentRequest;
import com.meridian.hms.repository.InvoiceRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final NotificationService notificationService;
    private final AccessControl accessControl;
    private final BillingPdfService pdfService;
    private final BigDecimal taxRate;
    private final int dueDays;

    public BillingService(InvoiceRepository invoiceRepository, NotificationService notificationService,
                          AccessControl accessControl, BillingPdfService pdfService,
                          @Value("${app.invoice.tax-rate}") BigDecimal taxRate,
                          @Value("${app.invoice.due-days}") int dueDays) {
        this.invoiceRepository = invoiceRepository;
        this.notificationService = notificationService;
        this.accessControl = accessControl;
        this.pdfService = pdfService;
        this.taxRate = taxRate;
        this.dueDays = dueDays;
    }

    // ------------------------------------------------------------ generation

    /** Idempotent: completing a visit twice never mints a second invoice. */
    @Transactional
    public Invoice generateForAppointment(Appointment appointment) {
        return invoiceRepository.findByAppointmentId(appointment.getId())
                .orElseGet(() -> {
                    Patient patient = appointment.getPatient();
                    String doctor = appointment.getDoctor().getUser().getName();
                    String department = appointment.getDoctor().getDepartment().getName();
                    Invoice invoice = new Invoice();
                    invoice.setInvoiceNumber(nextNumber());
                    invoice.setPatient(patient);
                    invoice.setAppointment(appointment);
                    invoice.setDueDate(LocalDate.now().plusDays(dueDays));
                    invoice.getItems().add(new Invoice.InvoiceItem(
                            "Consultation - " + doctor + " (" + department + ")",
                            1, money(appointment.getFee()), money(appointment.getFee())));
                    invoice.setNotes("Consultation invoice for the visit on "
                            + appointment.getDateTime().format(DateTimeFormatter.ofPattern("d MMM yyyy HH:mm")));
                    recalculate(invoice);
                    invoice = invoiceRepository.save(invoice);
                    notificationService.send(patient.getUser(), "Invoice ready",
                            "Invoice " + invoice.getInvoiceNumber() + " for Rs. " + invoice.getTotalAmount()
                                    + " is available in your portal.",
                            NotificationType.BILLING, "/patient/invoices");
                    return invoice;
                });
    }

    @Transactional
    public Invoice createForAdmission(Admission admission, int nights, BigDecimal doctorFee) {
        return invoiceRepository.findByAdmissionId(admission.getId())
                .orElseGet(() -> {
                    Invoice invoice = new Invoice();
                    invoice.setInvoiceNumber(nextNumber());
                    invoice.setPatient(admission.getPatient());
                    invoice.setAdmission(admission);
                    invoice.setDueDate(LocalDate.now().plusDays(dueDays));
                    invoice.getItems().add(new Invoice.InvoiceItem(
                            "Room charge - " + admission.getBed().getWard().getName() + " / " + admission.getBed().getCode()
                                    + " (" + nights + " night" + (nights == 1 ? "" : "s") + ")",
                            nights, money(admission.getDailyCharge()),
                            money(admission.getDailyCharge().multiply(BigDecimal.valueOf(nights)))));
                    if (doctorFee != null && doctorFee.signum() > 0) {
                        invoice.getItems().add(new Invoice.InvoiceItem(
                                "In-patient care - " + admission.getDoctor().getUser().getName(),
                                1, money(doctorFee), money(doctorFee)));
                    }
                    invoice.setNotes("Discharge invoice for admission #" + admission.getId());
                    recalculate(invoice);
                    invoice = invoiceRepository.save(invoice);
                    notificationService.send(admission.getPatient().getUser(), "Discharge invoice ready",
                            "Invoice " + invoice.getInvoiceNumber() + " for Rs. " + invoice.getTotalAmount()
                                    + " covers your admission and stay.",
                            NotificationType.BILLING, "/patient/invoices");
                    return invoice;
                });
    }

    // ------------------------------------------------------------------ read

    public PageSlice<Invoice> list(AuthUser user, String status, String search, int page, int limit) {
        List<Invoice> invoices;
        if (user.isAdmin() || user.isReceptionist()) {
            invoices = invoiceRepository.findAllByOrderByCreatedAtDesc();
        } else if (user.isPatient()) {
            invoices = invoiceRepository.findByPatientIdOrderByCreatedAtDesc(accessControl.currentPatient(user).getId());
        } else {
            Long doctorId = user.doctorId();
            invoices = invoiceRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(i -> (i.getAppointment() != null && i.getAppointment().getDoctor().getId().equals(doctorId))
                            || (i.getAdmission() != null && i.getAdmission().getDoctor().getId().equals(doctorId)))
                    .toList();
        }
        List<Invoice> filtered = new ArrayList<>(invoices);
        if (status != null && !status.isBlank()) {
            InvoiceStatus wanted = InvoiceStatus.valueOf(status.toUpperCase(Locale.ROOT));
            filtered.removeIf(i -> i.getStatus() != wanted);
        }
        if (search != null && !search.isBlank()) {
            String needle = search.toLowerCase(Locale.ROOT);
            filtered.removeIf(i -> !(i.getInvoiceNumber().toLowerCase(Locale.ROOT).contains(needle)
                    || i.getPatient().getUser().getName().toLowerCase(Locale.ROOT).contains(needle)));
        }
        return PageSlice.of(filtered, page, limit);
    }

    public Invoice get(AuthUser user, Long id) {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("Invoice"));
        assertCanRead(user, invoice);
        return invoice;
    }

    public void assertCanRead(AuthUser user, Invoice invoice) {
        if (user.isAdmin() || user.isReceptionist()) {
            return;
        }
        if (user.isPatient() && invoice.getPatient().getId().equals(user.patientId())) {
            return;
        }
        if (user.isDoctor()) {
            boolean ownAppointment = invoice.getAppointment() != null
                    && invoice.getAppointment().getDoctor().getId().equals(user.doctorId());
            boolean ownAdmission = invoice.getAdmission() != null
                    && invoice.getAdmission().getDoctor().getId().equals(user.doctorId());
            if (ownAppointment || ownAdmission) {
                return;
            }
        }
        throw ApiException.forbidden("INVOICE_ACCESS_DENIED", "This invoice is not yours");
    }

    public Map<String, Object> summary() {
        BigDecimal billed = zero(invoiceRepository.sumBilled(InvoiceStatus.VOID));
        BigDecimal collected = zero(invoiceRepository.sumCollected(InvoiceStatus.VOID));
        BigDecimal outstanding = billed.subtract(collected);
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("billed", billed);
        result.put("collected", collected);
        result.put("outstanding", outstanding);
        result.put("monthCollected", zero(invoiceRepository.sumCollectedSince(InvoiceStatus.VOID, monthStart)));
        result.put("monthBilled", zero(invoiceRepository.sumBilledSince(InvoiceStatus.VOID, monthStart)));
        result.put("pending", invoiceRepository.countByStatus(InvoiceStatus.PENDING));
        result.put("partiallyPaid", invoiceRepository.countByStatus(InvoiceStatus.PARTIALLY_PAID));
        result.put("paid", invoiceRepository.countByStatus(InvoiceStatus.PAID));
        result.put("voided", invoiceRepository.countByStatus(InvoiceStatus.VOID));
        return result;
    }

    public Map<String, Object> forPatient(AuthUser user, Long patientId) {
        if (!user.isAdmin() && !user.isPatient()) throw ApiException.forbidden("FORBIDDEN", "Patient or administrator access is required");
        if (user.isPatient() && !patientId.equals(user.patientId())) {
            throw ApiException.forbidden("FORBIDDEN", "You can only see your own invoices");
        }
        List<Invoice> invoices = invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        BigDecimal billed = invoices.stream().filter(i -> i.getStatus() != InvoiceStatus.VOID)
                .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = invoices.stream().filter(i -> i.getStatus() != InvoiceStatus.VOID)
                .map(Invoice::getAmountPaid).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("invoices", invoices);
        result.put("billed", billed);
        result.put("paid", paid);
        result.put("outstanding", billed.subtract(paid));
        return result;
    }

    // -------------------------------------------------------------- mutations

    @Transactional
    public Invoice pay(AuthUser user, Long id, PaymentRequest request) {
        if (!user.isAdmin() && !user.isReceptionist() && !user.isPatient()) throw ApiException.forbidden("FORBIDDEN", "Payment recording is not available for this role");
        Invoice invoice = invoiceRepository.lockById(id).orElseThrow(() -> ApiException.notFound("Invoice"));
        assertCanRead(user, invoice);
        if (invoice.getStatus() == InvoiceStatus.VOID) {
            throw ApiException.conflict("INVOICE_VOID", "A voided invoice cannot accept payments");
        }
        BigDecimal balance = invoice.getTotalAmount().subtract(invoice.getAmountPaid());
        BigDecimal amount = money(request.amount());
        if (amount.signum() <= 0) {
            throw ApiException.badRequest("INVALID_AMOUNT", "Payment amount must be greater than zero");
        }
        if (amount.compareTo(balance) > 0) {
            throw ApiException.conflict("OVERPAYMENT",
                    "Payment exceeds the outstanding balance of Rs. " + balance);
        }
        invoice.getPayments().add(new Invoice.Payment(amount, request.method(), request.reference(),
                LocalDateTime.now(), user.name()));
        invoice.setAmountPaid(money(invoice.getAmountPaid().add(amount)));
        invoice.setStatus(deriveStatus(invoice.getTotalAmount(), invoice.getAmountPaid()));
        invoice = invoiceRepository.save(invoice);

        notificationService.send(invoice.getPatient().getUser(), "Payment received",
                "We received Rs. " + amount + " against invoice " + invoice.getInvoiceNumber()
                        + ". Outstanding balance: Rs. " + invoice.getTotalAmount().subtract(invoice.getAmountPaid()) + ".",
                NotificationType.BILLING, "/patient/invoices");
        return invoice;
    }

    @Transactional
    public Invoice updateInvoice(Long id, InvoiceUpdateRequest request) {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("Invoice"));
        if (invoice.getStatus() == InvoiceStatus.VOID) {
            throw ApiException.conflict("INVOICE_VOID", "A voided invoice cannot be edited");
        }
        if (invoice.getAmountPaid().signum() > 0) {
            throw ApiException.conflict("INVOICE_HAS_PAYMENTS", "Invoices with payments cannot be re-priced");
        }
        if (request.discount() != null) {
            invoice.setDiscount(money(request.discount()));
        }
        if (request.items() != null && !request.items().isEmpty()) {
            invoice.getItems().clear();
            for (InvoiceItemRequest item : request.items()) {
                if (item.description() == null || item.description().isBlank()) {
                    continue;
                }
                int qty = item.quantity() == null ? 1 : item.quantity();
                BigDecimal unit = money(item.unitPrice() == null ? BigDecimal.ZERO : item.unitPrice());
                invoice.getItems().add(new Invoice.InvoiceItem(item.description().trim(), qty, unit,
                        money(unit.multiply(BigDecimal.valueOf(qty)))));
            }
        }
        if (request.notes() != null) {
            invoice.setNotes(request.notes());
        }
        recalculate(invoice);
        return invoiceRepository.save(invoice);
    }

    @Transactional
    public Invoice voidInvoice(Long id) {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("Invoice"));
        if (invoice.getAmountPaid().signum() > 0) {
            throw ApiException.conflict("INVOICE_HAS_PAYMENTS", "An invoice with payments cannot be voided");
        }
        invoice.setStatus(InvoiceStatus.VOID);
        return invoiceRepository.save(invoice);
    }

    @Transactional
    public void voidQuietly(Invoice invoice) {
        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setNotes((invoice.getNotes() == null ? "" : invoice.getNotes() + " | ")
                + "Voided because the appointment was cancelled.");
        invoiceRepository.save(invoice);
    }

    public byte[] pdf(Long id) {
        Invoice invoice = invoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("Invoice"));
        return pdfService.render(invoice);
    }

    // ----------------------------------------------------------------- helpers

    public void recalculate(Invoice invoice) {
        BigDecimal subTotal = invoice.getItems().stream()
                .map(i -> i.getAmount() == null ? BigDecimal.ZERO : i.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        subTotal = money(subTotal);
        BigDecimal discount = invoice.getDiscount() == null ? BigDecimal.ZERO : money(invoice.getDiscount());
        if (discount.signum() < 0) {
            discount = BigDecimal.ZERO;
        }
        if (discount.compareTo(subTotal) > 0) {
            discount = subTotal;
        }
        BigDecimal taxable = subTotal.subtract(discount);
        BigDecimal tax = money(taxable.multiply(taxRate));
        invoice.setSubTotal(subTotal);
        invoice.setDiscount(discount);
        invoice.setTaxAmount(tax);
        invoice.setTotalAmount(money(taxable.add(tax)));
        invoice.setStatus(deriveStatus(invoice.getTotalAmount(), invoice.getAmountPaid()));
    }

    public InvoiceStatus deriveStatus(BigDecimal total, BigDecimal paid) {
        if (paid == null || paid.signum() == 0) {
            return InvoiceStatus.PENDING;
        }
        return paid.compareTo(total) >= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : money(value);
    }

    private String nextNumber() {
        LocalDate today = LocalDate.now();
        long count = invoiceRepository.countByCreatedAtBetween(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        return "INV-" + today.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + String.format("%04d", count + 1);
    }
}
