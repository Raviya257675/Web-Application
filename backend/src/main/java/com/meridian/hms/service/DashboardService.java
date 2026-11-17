package com.meridian.hms.service;

import com.meridian.hms.domain.Admission;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.DoctorLeave;
import com.meridian.hms.domain.Enums.AdmissionStatus;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Enums.LabOrderStatus;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.domain.LabOrder;
import com.meridian.hms.domain.MedicalRecord;
import com.meridian.hms.domain.Medicine;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.domain.Prescription;
import com.meridian.hms.repository.AdmissionRepository;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.BedRepository;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorLeaveRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.InvoiceRepository;
import com.meridian.hms.repository.LabOrderRepository;
import com.meridian.hms.repository.MedicalRecordRepository;
import com.meridian.hms.repository.MedicineRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.repository.PrescriptionRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    public Map<String,Object> receptionist() {
        var today = appointmentRepository.findAll().stream().filter(a -> a.getDateTime().toLocalDate().equals(LocalDate.now())).toList();
        return Map.of("appointmentsToday", today.size(), "checkedIn", today.stream().filter(a -> a.getCheckedInAt()!=null && a.getStatus()==AppointmentStatus.BOOKED).count(),
                "patients", patientRepository.count(), "completedToday", today.stream().filter(a -> a.getStatus()==AppointmentStatus.COMPLETED).count());
    }

    public Map<String,Object> pharmacist() {
        return Map.of("medicines", medicineRepository.count(), "lowStock", medicineRepository.countLowStock(), "stockValue", medicineRepository.stockValue());
    }

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final MedicineRepository medicineRepository;
    private final LabOrderRepository labOrderRepository;
    private final BedRepository bedRepository;
    private final AdmissionRepository admissionRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final DoctorLeaveRepository leaveRepository;
    private final BillingService billingService;
    private final AccessControl accessControl;

    public DashboardService(PatientRepository patientRepository, DoctorRepository doctorRepository,
                            DepartmentRepository departmentRepository, AppointmentRepository appointmentRepository,
                            InvoiceRepository invoiceRepository, MedicineRepository medicineRepository,
                            LabOrderRepository labOrderRepository, BedRepository bedRepository,
                            AdmissionRepository admissionRepository, MedicalRecordRepository medicalRecordRepository,
                            PrescriptionRepository prescriptionRepository, DoctorLeaveRepository leaveRepository,
                            BillingService billingService, AccessControl accessControl) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.departmentRepository = departmentRepository;
        this.appointmentRepository = appointmentRepository;
        this.invoiceRepository = invoiceRepository;
        this.medicineRepository = medicineRepository;
        this.labOrderRepository = labOrderRepository;
        this.bedRepository = bedRepository;
        this.admissionRepository = admissionRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.leaveRepository = leaveRepository;
        this.billingService = billingService;
        this.accessControl = accessControl;
    }

    public Map<String, Object> admin() {
        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.plusDays(1).atStartOfDay();

        List<Appointment> appointments = appointmentRepository.findAll();
        List<Invoice> invoices = invoiceRepository.findAll();
        long todayAppointments = appointments.stream()
                .filter(a -> !a.getDateTime().isBefore(dayStart) && a.getDateTime().isBefore(dayEnd)).count();
        long upcoming = appointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getDateTime().isAfter(LocalDateTime.now()))
                .count();

        BigDecimal todayRevenue = invoices.stream()
                .flatMap(i -> i.getPayments().stream())
                .filter(p -> p.getPaidAt() != null && p.getPaidAt().toLocalDate().equals(today))
                .map(Invoice.Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> revenue = billingService.summary();

        List<Map<String, Object>> trends = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long count = appointments.stream().filter(a -> a.getDateTime().toLocalDate().equals(day)).count();
            BigDecimal dayRevenue = invoices.stream().flatMap(inv -> inv.getPayments().stream())
                    .filter(p -> p.getPaidAt() != null && p.getPaidAt().toLocalDate().equals(day))
                    .map(Invoice.Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            trends.add(Map.of("date", day.toString(),
                    "label", day.format(DateTimeFormatter.ofPattern("EEE")),
                    "appointments", count,
                    "revenue", dayRevenue));
        }

        Map<String, Long> byStatus = appointments.stream()
                .collect(Collectors.groupingBy(a -> a.getStatus().name(), Collectors.counting()));

        List<Department> departments = departmentRepository.findByActiveTrueOrderByNameAsc();
        List<Doctor> doctors = doctorRepository.findAll();
        List<Map<String, Object>> departmentLoad = new ArrayList<>();
        for (Department department : departments) {
            long doctorsInDept = doctors.stream()
                    .filter(d -> d.getDepartment().getId().equals(department.getId())).count();
            long visits = appointments.stream()
                    .filter(a -> a.getDoctor().getDepartment().getId().equals(department.getId())).count();
            departmentLoad.add(Map.of("name", department.getName(), "doctors", doctorsInDept, "appointments", visits));
        }

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("patients", patientRepository.count());
        counts.put("doctors", doctorRepository.countByActiveTrue());
        counts.put("departments", departments.size());
        counts.put("appointmentsToday", todayAppointments);
        counts.put("upcoming", upcoming);
        counts.put("lowStock", medicineRepository.countLowStock());
        counts.put("pendingLabs", labOrderRepository.countByStatus(LabOrderStatus.ORDERED)
                + labOrderRepository.countByStatus(LabOrderStatus.COLLECTED));
        counts.put("activeAdmissions", admissionRepository.countByStatus(AdmissionStatus.ADMITTED));
        counts.put("beds", bedRepository.count());

        Map<String, Object> beds = new LinkedHashMap<>();
        long totalBeds = bedRepository.count();
        long occupied = bedRepository.countByStatus(com.meridian.hms.domain.Enums.BedStatus.OCCUPIED);
        beds.put("total", totalBeds);
        beds.put("occupied", occupied);
        beds.put("available", totalBeds - occupied - bedRepository.countByStatus(com.meridian.hms.domain.Enums.BedStatus.MAINTENANCE));
        beds.put("rate", totalBeds == 0 ? 0 : Math.round(occupied * 1000.0 / totalBeds) / 10.0);

        List<Appointment> recent = appointments.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(6).toList();
        List<Medicine> lowStock = medicineRepository.findLowStock().stream().limit(5).toList();
        List<LabOrder> pendingLabs = labOrderRepository.findAllByOrderByOrderedAtDesc().stream()
                .filter(o -> o.getStatus() == LabOrderStatus.ORDERED || o.getStatus() == LabOrderStatus.COLLECTED)
                .limit(5).toList();
        List<Admission> activeAdmissions = admissionRepository.findByStatusOrderByAdmittedAtDesc(AdmissionStatus.ADMITTED)
                .stream().limit(5).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("counts", counts);
        result.put("revenue", Map.of(
                "today", todayRevenue,
                "month", revenue.get("monthCollected"),
                "billed", revenue.get("billed"),
                "collected", revenue.get("collected"),
                "outstanding", revenue.get("outstanding")));
        result.put("beds", beds);
        result.put("trends", trends);
        result.put("statusBreakdown", byStatus.entrySet().stream()
                .map(e -> Map.of("status", e.getKey(), "count", e.getValue())).toList());
        result.put("departmentLoad", departmentLoad);
        result.put("recentAppointments", recent);
        result.put("lowStockMedicines", lowStock);
        result.put("pendingLabOrders", pendingLabs);
        result.put("activeAdmissions", activeAdmissions);
        return result;
    }

    public Map<String, Object> doctor(AuthUser user) {
        Doctor doctor = accessControl.currentDoctor(user);
        LocalDate today = LocalDate.now();
        List<Appointment> mine = appointmentRepository.findByDoctorIdOrderByDateTimeAsc(doctor.getId());
        List<Appointment> todayList = mine.stream()
                .filter(a -> a.getDateTime().toLocalDate().equals(today)).toList();
        List<MedicalRecord> records = medicalRecordRepository.findByDoctorIdOrderByCreatedAtDesc(doctor.getId());
        List<LabOrder> labOrders = labOrderRepository.findByDoctorIdOrderByOrderedAtDesc(doctor.getId());
        List<DoctorLeave> leaves = leaveRepository.findByDoctorIdOrderByStartDateDesc(doctor.getId());

        List<Map<String, Object>> trends = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            trends.add(Map.of("label", day.format(DateTimeFormatter.ofPattern("EEE")),
                    "date", day.toString(),
                    "count", mine.stream().filter(a -> a.getDateTime().toLocalDate().equals(day)).count()));
        }

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("today", todayList.size());
        counts.put("completedToday", todayList.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count());
        counts.put("patients", mine.stream().map(a -> a.getPatient().getId()).distinct().count());
        counts.put("records", records.size());
        counts.put("pendingLabs", labOrders.stream().filter(o -> o.getStatus() != LabOrderStatus.COMPLETED
                && o.getStatus() != LabOrderStatus.CANCELLED).count());
        counts.put("pendingLeave", leaves.stream()
                .filter(l -> l.getStatus() == com.meridian.hms.domain.Enums.LeaveStatus.PENDING).count());

        Appointment next = mine.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getDateTime().isAfter(LocalDateTime.now()))
                .findFirst().orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("doctor", doctor);
        result.put("counts", counts);
        result.put("todayAppointments", todayList);
        result.put("nextAppointment", next);
        result.put("trends", trends);
        result.put("recentRecords", records.stream().limit(5).toList());
        result.put("pendingLabOrders", labOrders.stream()
                .filter(o -> o.getStatus() != LabOrderStatus.COMPLETED).limit(5).toList());
        result.put("leaves", leaves.stream().limit(4).toList());
        return result;
    }

    public Map<String, Object> patient(AuthUser user) {
        Patient patient = accessControl.currentPatient(user);
        List<Appointment> appointments = appointmentRepository.findByPatientIdOrderByDateTimeDesc(patient.getId());
        List<Invoice> invoices = invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        List<MedicalRecord> records = medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        List<LabOrder> labs = labOrderRepository.findByPatientIdOrderByOrderedAtDesc(patient.getId());
        List<Admission> admissions = admissionRepository.findByPatientIdOrderByAdmittedAtDesc(patient.getId());

        BigDecimal outstanding = invoices.stream()
                .filter(i -> i.getStatus() != InvoiceStatus.VOID)
                .map(i -> i.getTotalAmount().subtract(i.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        Appointment upcoming = appointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getDateTime().isAfter(LocalDateTime.now()))
                .min((a, b) -> a.getDateTime().compareTo(b.getDateTime())).orElse(null);
        Admission activeAdmission = admissions.stream()
                .filter(a -> a.getStatus() == AdmissionStatus.ADMITTED).findFirst().orElse(null);

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("visits", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count());
        counts.put("upcoming", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.BOOKED
                && a.getDateTime().isAfter(LocalDateTime.now())).count());
        counts.put("records", records.size());
        counts.put("prescriptions", prescriptions.size());
        counts.put("labResults", labs.stream().filter(l -> l.getStatus() == LabOrderStatus.COMPLETED).count());
        counts.put("pendingLabs", labs.stream().filter(l -> l.getStatus() != LabOrderStatus.COMPLETED
                && l.getStatus() != LabOrderStatus.CANCELLED).count());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("patient", patient);
        result.put("counts", counts);
        result.put("outstanding", outstanding);
        result.put("upcoming", upcoming);
        result.put("activeAdmission", activeAdmission);
        result.put("recentRecords", records.stream().limit(3).toList());
        result.put("recentInvoices", invoices.stream().limit(4).toList());
        result.put("activePrescriptions", prescriptions.stream().limit(3).toList());
        result.put("recentLabs", labs.stream().limit(4).toList());
        return result;
    }
}
