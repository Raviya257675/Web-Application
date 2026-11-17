package com.meridian.hms.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Invoice;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;

@Service
public class BillingPdfService {

    private static final Color PRIMARY = new Color(15, 98, 176);
    private static final Color INK = new Color(16, 36, 58);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color RULE = new Color(226, 232, 240);
    private static final Color WASH = new Color(244, 248, 253);
    private static final DecimalFormat MONEY = new DecimalFormat("#,##0.00");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm");

    public byte[] render(Invoice invoice) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 48, 48);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font brand = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 19, PRIMARY);
            Font small = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
            Font body = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, INK);
            Font bodyBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, INK);
            Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, INK);
            Font label = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, MUTED);

            // ---------- header ----------
            PdfPTable header = new PdfPTable(new float[]{2.4f, 1f});
            header.setWidthPercentage(100);
            PdfPCell left = cell();
            left.addElement(new Paragraph("MERIDIAN HOSPITAL", brand));
            left.addElement(new Paragraph("12 Lakeview Avenue, Colombo 03, Sri Lanka", small));
            left.addElement(new Paragraph("+94 11 234 5678  ·  billing@meridian.health", small));
            left.addElement(new Paragraph("Reg. No. HMS-2026-0042  ·  Tax ID 1144556677", small));
            header.addCell(left);

            PdfPCell right = cell();
            right.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph invoiceTitle = new Paragraph("INVOICE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, INK));
            invoiceTitle.setAlignment(Element.ALIGN_RIGHT);
            right.addElement(invoiceTitle);
            Paragraph number = new Paragraph(invoice.getInvoiceNumber(), bodyBold);
            number.setAlignment(Element.ALIGN_RIGHT);
            right.addElement(number);
            Paragraph issued = new Paragraph("Issued " + invoice.getCreatedAt().format(DATE), small);
            issued.setAlignment(Element.ALIGN_RIGHT);
            right.addElement(issued);
            Paragraph due = new Paragraph("Due " + (invoice.getDueDate() == null ? "-" : invoice.getDueDate().format(DATE)), small);
            due.setAlignment(Element.ALIGN_RIGHT);
            right.addElement(due);
            header.addCell(right);
            document.add(header);

            addRule(document);

            // ---------- parties ----------
            PdfPTable parties = new PdfPTable(new float[]{1, 1, 1});
            parties.setWidthPercentage(100);
            parties.setSpacingBefore(14);

            PdfPCell billedTo = cell();
            billedTo.addElement(new Paragraph("BILLED TO", label));
            billedTo.addElement(new Paragraph(invoice.getPatient().getUser().getName(), bodyBold));
            billedTo.addElement(new Paragraph(invoice.getPatient().getUser().getEmail(), body));
            if (invoice.getPatient().getUser().getPhone() != null) {
                billedTo.addElement(new Paragraph(invoice.getPatient().getUser().getPhone(), body));
            }
            if (invoice.getPatient().getAddress() != null && !invoice.getPatient().getAddress().isBlank()) {
                billedTo.addElement(new Paragraph(invoice.getPatient().getAddress(), body));
            }
            parties.addCell(billedTo);

            PdfPCell context = cell();
            context.addElement(new Paragraph("SERVICE", label));
            if (invoice.getAppointment() != null) {
                context.addElement(new Paragraph("Out-patient consultation", bodyBold));
                context.addElement(new Paragraph("Dr. " + invoice.getAppointment().getDoctor().getUser().getName()
                        + " · " + invoice.getAppointment().getDoctor().getDepartment().getName(), body));
                context.addElement(new Paragraph("Visit: " + invoice.getAppointment().getDateTime().format(DATE_TIME), body));
            } else if (invoice.getAdmission() != null) {
                context.addElement(new Paragraph("In-patient admission", bodyBold));
                context.addElement(new Paragraph("Dr. " + invoice.getAdmission().getDoctor().getUser().getName(), body));
                context.addElement(new Paragraph(invoice.getAdmission().getBed().getWard().getName()
                        + " · Bed " + invoice.getAdmission().getBed().getCode(), body));
            } else {
                context.addElement(new Paragraph("Hospital services", bodyBold));
            }
            parties.addCell(context);

            PdfPCell status = cell();
            status.addElement(new Paragraph("STATUS", label));
            Color statusColor = switch (invoice.getStatus()) {
                case PAID -> new Color(22, 163, 74);
                case PARTIALLY_PAID -> new Color(217, 119, 6);
                case VOID -> new Color(220, 38, 38);
                default -> MUTED;
            };
            status.addElement(new Paragraph(pretty(invoice.getStatus()),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, statusColor)));
            status.addElement(new Paragraph("Balance due", label));
            status.addElement(new Paragraph("Rs. " + MONEY.format(invoice.getTotalAmount().subtract(invoice.getAmountPaid())),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, INK)));
            parties.addCell(status);
            document.add(parties);

            // ---------- line items ----------
            PdfPTable items = new PdfPTable(new float[]{4.4f, 0.9f, 1.4f, 1.4f});
            items.setWidthPercentage(100);
            items.setSpacingBefore(18);
            items.setHeaderRows(1);
            addHead(items, "DESCRIPTION", Element.ALIGN_LEFT);
            addHead(items, "QTY", Element.ALIGN_CENTER);
            addHead(items, "UNIT", Element.ALIGN_RIGHT);
            addHead(items, "AMOUNT", Element.ALIGN_RIGHT);

            boolean shade = false;
            for (Invoice.InvoiceItem item : invoice.getItems()) {
                addBody(items, item.getDescription(), Element.ALIGN_LEFT, body, shade);
                addBody(items, String.valueOf(item.getQuantity()), Element.ALIGN_CENTER, body, shade);
                addBody(items, "Rs. " + MONEY.format(item.getUnitPrice()), Element.ALIGN_RIGHT, body, shade);
                addBody(items, "Rs. " + MONEY.format(item.getAmount()), Element.ALIGN_RIGHT, body, shade);
                shade = !shade;
            }
            document.add(items);

            // ---------- totals ----------
            PdfPTable totals = new PdfPTable(new float[]{3.2f, 1.2f});
            totals.setWidthPercentage(55);
            totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totals.setSpacingBefore(12);
            totalRow(totals, "Sub-total", invoice.getSubTotal(), body);
            if (invoice.getDiscount().signum() > 0) {
                totalRow(totals, "Discount", invoice.getDiscount().negate(), body);
            }
            totalRow(totals, "Tax", invoice.getTaxAmount(), body);
            totalRow(totals, "Total", invoice.getTotalAmount(), bodyBold);
            totalRow(totals, "Paid", invoice.getAmountPaid(), body);
            totalRow(totals, "Balance due", invoice.getTotalAmount().subtract(invoice.getAmountPaid()), bodyBold);
            document.add(totals);

            // ---------- payments ----------
            if (!invoice.getPayments().isEmpty()) {
                Paragraph paymentsTitle = new Paragraph("PAYMENTS RECEIVED",
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MUTED));
                paymentsTitle.setSpacingBefore(20);
                paymentsTitle.setSpacingAfter(6);
                document.add(paymentsTitle);
                PdfPTable payments = new PdfPTable(new float[]{1.4f, 1.4f, 1.6f, 2f});
                payments.setWidthPercentage(100);
                addHead(payments, "DATE", Element.ALIGN_LEFT);
                addHead(payments, "METHOD", Element.ALIGN_LEFT);
                addHead(payments, "REFERENCE", Element.ALIGN_LEFT);
                addHead(payments, "AMOUNT", Element.ALIGN_RIGHT);
                for (Invoice.Payment payment : invoice.getPayments()) {
                    addBody(payments, payment.getPaidAt() == null ? "-" : payment.getPaidAt().format(DATE_TIME),
                            Element.ALIGN_LEFT, body, false);
                    addBody(payments, payment.getMethod() == null ? "-" : payment.getMethod().name(),
                            Element.ALIGN_LEFT, body, false);
                    addBody(payments, payment.getReference() == null ? "-" : payment.getReference(),
                            Element.ALIGN_LEFT, body, false);
                    addBody(payments, "Rs. " + MONEY.format(payment.getAmount()), Element.ALIGN_RIGHT, body, false);
                }
                document.add(payments);
            }

            if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                Paragraph notes = new Paragraph("Notes: " + invoice.getNotes(), small);
                notes.setSpacingBefore(16);
                document.add(notes);
            }

            addRule(document);
            Paragraph footer = new Paragraph(
                    "Thank you for choosing Meridian. This is a computer-generated invoice from Meridian HMS "
                            + "(Spring Boot). No signature is required.", small);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(8);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            if (document.isOpen()) {
                document.close();
            }
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF_FAILED",
                    "The invoice PDF could not be generated");
        }
    }

    private void addHead(PdfPTable table, String text, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, MUTED)));
        cell.setBackgroundColor(WASH);
        cell.setBorderColor(RULE);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        cell.setHorizontalAlignment(align);
        table.addCell(cell);
    }

    private void addBody(PdfPTable table, String text, int align, Font font, boolean shade) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, font));
        cell.setBorderColor(RULE);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        cell.setPaddingLeft(8);
        cell.setPaddingRight(8);
        cell.setHorizontalAlignment(align);
        if (shade) {
            cell.setBackgroundColor(new Color(250, 252, 255));
        }
        table.addCell(cell);
    }

    private void totalRow(PdfPTable table, String label, BigDecimal value, Font font) {
        PdfPCell left = new PdfPCell(new Phrase(label, font));
        left.setBorderColor(RULE);
        left.setPadding(6);
        left.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(left);
        PdfPCell right = new PdfPCell(new Phrase("Rs. " + MONEY.format(value), font));
        right.setBorderColor(RULE);
        right.setPadding(6);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(right);
    }

    private PdfPCell cell() {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(0);
        cell.setPadding(0);
        return cell;
    }

    private void addRule(Document document) throws Exception {
        PdfPTable rule = new PdfPTable(1);
        rule.setWidthPercentage(100);
        rule.setSpacingBefore(12);
        PdfPCell cell = new PdfPCell();
        cell.setBorderWidthTop(1);
        cell.setBorderWidthBottom(0);
        cell.setBorderWidthLeft(0);
        cell.setBorderWidthRight(0);
        cell.setBorderColorTop(RULE);
        cell.setMinimumHeight(1);
        rule.addCell(cell);
        document.add(rule);
    }

    private String pretty(InvoiceStatus status) {
        return status.name().replace('_', ' ');
    }
}
