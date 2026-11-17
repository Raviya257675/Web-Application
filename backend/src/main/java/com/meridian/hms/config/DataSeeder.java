package com.meridian.hms.config;

import com.meridian.hms.domain.Admission;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.AuditLog;
import com.meridian.hms.domain.Bed;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.domain.DoctorAvailability;
import com.meridian.hms.domain.DoctorLeave;
import com.meridian.hms.domain.Enums.AdmissionStatus;
import com.meridian.hms.domain.Enums.AppointmentStatus;
import com.meridian.hms.domain.Enums.BedStatus;
import com.meridian.hms.domain.Enums.Gender;
import com.meridian.hms.domain.Enums.InvoiceStatus;
import com.meridian.hms.domain.Enums.LabOrderStatus;
import com.meridian.hms.domain.Enums.LabPriority;
import com.meridian.hms.domain.Enums.LeaveStatus;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.Invoice;
import com.meridian.hms.domain.LabOrder;
import com.meridian.hms.domain.LabTest;
import com.meridian.hms.domain.MedicalRecord;
import com.meridian.hms.domain.Medicine;
import com.meridian.hms.domain.Notification;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.domain.Prescription;
import com.meridian.hms.domain.StockBatch;
import com.meridian.hms.domain.StockMovement;
import com.meridian.hms.domain.User;
import com.meridian.hms.domain.Ward;
import com.meridian.hms.repository.AdmissionRepository;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.AuditLogRepository;
import com.meridian.hms.repository.BedRepository;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorLeaveRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.InvoiceRepository;
import com.meridian.hms.repository.LabOrderRepository;
import com.meridian.hms.repository.LabTestRepository;
import com.meridian.hms.repository.MedicalRecordRepository;
import com.meridian.hms.repository.MedicineRepository;
import com.meridian.hms.repository.NotificationRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.repository.PrescriptionRepository;
import com.meridian.hms.repository.StockBatchRepository;
import com.meridian.hms.repository.StockMovementRepository;
import com.meridian.hms.repository.UserRepository;
import com.meridian.hms.repository.WardRepository;
import com.meridian.hms.service.BillingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds a complete, demoable hospital the first time the app starts against an
 * empty database. Dates are relative to "today" so the demo never goes stale.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorLeaveRepository leaveRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository recordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final InvoiceRepository invoiceRepository;
    private final MedicineRepository medicineRepository;
    private final StockBatchRepository batchRepository;
    private final StockMovementRepository movementRepository;
    private final LabTestRepository labTestRepository;
    private final LabOrderRepository labOrderRepository;
    private final WardRepository wardRepository;
    private final BedRepository bedRepository;
    private final AdmissionRepository admissionRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final BillingService billingService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${app.seed.password:Password123!}")
    private String seedPassword;

    public DataSeeder(UserRepository userRepository, PatientRepository patientRepository,
                      DepartmentRepository departmentRepository, DoctorRepository doctorRepository,
                      DoctorLeaveRepository leaveRepository, AppointmentRepository appointmentRepository,
                      MedicalRecordRepository recordRepository, PrescriptionRepository prescriptionRepository,
                      InvoiceRepository invoiceRepository, MedicineRepository medicineRepository,
                      StockBatchRepository batchRepository, StockMovementRepository movementRepository,
                      LabTestRepository labTestRepository, LabOrderRepository labOrderRepository,
                      WardRepository wardRepository, BedRepository bedRepository,
                      AdmissionRepository admissionRepository, NotificationRepository notificationRepository,
                      AuditLogRepository auditLogRepository, BillingService billingService,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.departmentRepository = departmentRepository;
        this.doctorRepository = doctorRepository;
        this.leaveRepository = leaveRepository;
        this.appointmentRepository = appointmentRepository;
        this.recordRepository = recordRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.invoiceRepository = invoiceRepository;
        this.medicineRepository = medicineRepository;
        this.batchRepository = batchRepository;
        this.movementRepository = movementRepository;
        this.labTestRepository = labTestRepository;
        this.labOrderRepository = labOrderRepository;
        this.wardRepository = wardRepository;
        this.bedRepository = bedRepository;
        this.admissionRepository = admissionRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.billingService = billingService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled || userRepository.count() > 0) {
            return;
        }
        log.info("Seeding Meridian HMS demo data...");
        seed();
        log.info("Seed complete. Use the configured demo credentials for this local test environment.");
    }

    private void seed() {
        Department cardiology = department("Cardiology", "heart", new BigDecimal("4500.00"),
                "Chest pain, arrhythmia, heart failure and preventive cardiac care.");
        Department neurology = department("Neurology", "brain", new BigDecimal("5000.00"),
                "Headache, stroke, epilepsy, nerve and movement disorders.");
        Department general = department("General Medicine", "stethoscope", new BigDecimal("2500.00"),
                "Everyday illness, fever, diabetes and long-term condition reviews.");
        Department ortho = department("Orthopaedics", "bone", new BigDecimal("4000.00"),
                "Fractures, joint pain, sports injury and post-operative follow-up.");
        Department paeds = department("Paediatrics", "child", new BigDecimal("3000.00"),
                "Newborn to adolescent care, growth checks and vaccinations.");

        User admin = user("Asha Menon", "admin@hospital.test", Role.ADMIN, "+94 77 123 4567");
        User admin2 = user("Ravi Kumar", "admin.ops@hospital.test", Role.ADMIN, "+94 77 123 8899");

        Doctor reed = doctor("Dr. Alice Reed", "doctor@hospital.test", cardiology,
                "Interventional Cardiology", new BigDecimal("4500.00"), 14,
                "Fellow of the Royal College of Physicians. Focus on valve disease and coronary intervention.",
                slots(1, 5, 9, 0, 13, 0, 30));
        Doctor ortiz = doctor("Dr. Ben Ortiz", "doctor.neuro@hospital.test", neurology,
                "Neurology", new BigDecimal("5000.00"), 11,
                "Special interest in epilepsy, migraine and neuromuscular disorders.",
                slots(2, 2, 10, 0, 14, 0, 30), slots(4, 4, 10, 0, 14, 0, 30),
                slots(6, 6, 10, 0, 14, 0, 30));
        Doctor wu = doctor("Dr. Chen Wu", "doctor.gp@hospital.test", general,
                "General Medicine", new BigDecimal("2500.00"), 9,
                "Primary care, diabetes management and preventive health screening.",
                slots(1, 6, 8, 0, 12, 0, 30));
        Doctor nair = doctor("Dr. Priya Nair", "doctor.ortho@hospital.test", ortho,
                "Orthopaedic Surgery", new BigDecimal("4000.00"), 12,
                "Knee and shoulder arthroscopy, sports injuries and fracture fixation.",
                slots(1, 1, 14, 0, 18, 0, 30), slots(3, 3, 14, 0, 18, 0, 30),
                slots(5, 5, 14, 0, 18, 0, 30));
        Doctor kim = doctor("Dr. Samuel Kim", "doctor.paeds@hospital.test", paeds,
                "Paediatrics", new BigDecimal("3000.00"), 8,
                "General paediatrics, childhood asthma and developmental assessment.",
                slots(1, 5, 9, 0, 12, 0, 30), slots(1, 5, 14, 0, 17, 0, 30));
        Doctor zahra = doctor("Dr. Fatima Zahra", "doctor.cardio2@hospital.test", cardiology,
                "Preventive Cardiology", new BigDecimal("4200.00"), 10,
                "Women's cardiac health, hypertension and cholesterol clinics.",
                slots(2, 2, 13, 0, 17, 0, 30), slots(4, 4, 13, 0, 17, 0, 30));

        Patient john = patient("John Doe", "patient@hospital.test", LocalDate.of(1988, 4, 12),
                Gender.MALE, "O+", "18 Rose Lane, Colombo 05", "Penicillin", "+94 71 445 1122");
        Patient maya = patient("Maya Singh", "patient.maya@hospital.test", LocalDate.of(1995, 11, 2),
                Gender.FEMALE, "B+", "42 Hill Street, Kandy", "None", "+94 76 332 0099");
        Patient omar = patient("Omar Haddad", "patient.omar@hospital.test", LocalDate.of(1972, 7, 21),
                Gender.MALE, "A-", "7 Marine Drive, Galle", "Sulfa drugs, aspirin", "+94 77 908 7711");
        Patient nadeesha = patient("Nadeesha Perera", "patient.nadeesha@hospital.test",
                LocalDate.of(2016, 2, 9), Gender.FEMALE, "O-", "5 Temple Road, Negombo", "None",
                "+94 70 221 3344");
        Patient liam = patient("Liam Fernando", "patient.liam@hospital.test", LocalDate.of(1990, 9, 30),
                Gender.MALE, "AB+", "11 Park Avenue, Colombo 07", "Latex", "+94 71 667 8800");
        Patient aisha = patient("Aisha Khan", "patient.aisha@hospital.test", LocalDate.of(2001, 6, 18),
                Gender.FEMALE, "B-", "23 Garden Road, Colombo 06", "None", "+94 76 550 1122");

        LocalDate today = LocalDate.now();
        Set<String> used = new HashSet<>();

        Appointment a1 = appointment(john, reed, today.minusDays(30).atTime(10, 0), AppointmentStatus.COMPLETED, "Chest tightness during exercise");
        Appointment a2 = appointment(maya, wu, today.minusDays(21).atTime(9, 0), AppointmentStatus.COMPLETED, "Persistent fatigue and thirst");
        Appointment a3 = appointment(omar, ortiz, today.minusDays(14).atTime(10, 30), AppointmentStatus.COMPLETED, "Recurring migraine with aura");
        Appointment a4 = appointment(nadeesha, kim, today.minusDays(7).atTime(15, 0), AppointmentStatus.COMPLETED, "Cough and mild fever");
        Appointment a5 = appointment(liam, nair, today.minusDays(3).atTime(15, 0), AppointmentStatus.COMPLETED, "Right knee pain after football");
        appointment(aisha, reed, today.plusDays(3).atTime(11, 0), AppointmentStatus.CANCELLED, "Routine review");
        appointment(john, wu, today.minusDays(2).atTime(8, 30), AppointmentStatus.NO_SHOW, "Blood pressure review");

        MedicalRecord recordVisit1 = record(john, reed, a1, "Stable angina",
                "Exertional chest tightness, no rest pain", "128/82", 74, 36.7, 79.0, 176.0, 98,
                "ECG shows minor ST depression in V4-V6. Started on a beta blocker and statin. Review in six weeks.",
                today.plusDays(14), "Low-dose aspirin with food. Report any black stools immediately.",
                List.of(rx("Atorvastatin 10mg", "10 mg", "Once at night", 30, 30, "After dinner"),
                        rx("Aspirin 75mg", "75 mg", "Once daily", 30, 30, "After breakfast")),
                List.of());
        record(maya, wu, a2, "Type 2 diabetes mellitus - newly diagnosed",
                "Fatigue, polyuria, unintentional weight loss", "118/76", 82, 36.5, 68.0, 162.0, 99,
                "HbA1c 7.9%. Started metformin with diet and exercise counselling. Retest in three months.",
                today.plusDays(20), "Take metformin with meals to reduce stomach upset.",
                List.of(rx("Metformin 500mg", "500 mg", "Twice daily", 30, 60, "With meals")),
                List.of());
        record(omar, ortiz, a3, "Migraine with aura",
                "Unilateral throbbing headache, photophobia, visual aura", "134/86", 70, 36.8, 84.0, 180.0, 97,
                "Classic migraine with visual aura. Trigger diary advised. Started on a preventive agent.",
                today.plusDays(28), "Keep a headache diary and avoid skipping meals.",
                List.of(rx("Amlodipine 5mg", "5 mg", "Once daily", 30, 30, "Morning")),
                List.of());
        record(nadeesha, kim, a4, "Viral upper respiratory tract infection",
                "Cough, coryza, low-grade fever", "98/64", 102, 37.8, 22.0, 118.0, 98,
                "Self-limiting viral illness. Supportive care, fluids and rest. No antibiotics indicated.",
                today.plusDays(7), "Return sooner if the fever persists beyond five days.",
                List.of(rx("Paracetamol 500mg", "250 mg", "Every 6 hours as needed", 3, 12, "Do not exceed 4 doses a day")),
                List.of());

        Invoice i1 = billingService.generateForAppointment(a1);
        pay(i1, new BigDecimal("4725.00"), InvoiceStatus.PAID);
        Invoice i2 = billingService.generateForAppointment(a2);
        pay(i2, new BigDecimal("1000.00"), InvoiceStatus.PARTIALLY_PAID);
        billingService.generateForAppointment(a3);
        Invoice i4 = billingService.generateForAppointment(a4);
        pay(i4, new BigDecimal("3150.00"), InvoiceStatus.PAID);

        bookUpcoming(john, reed, used, 1, "Follow-up after angina treatment");
        bookUpcoming(maya, wu, used, 2, "Diabetes review");
        bookUpcoming(omar, ortiz, used, 2, "Migraine follow-up");
        bookUpcoming(liam, nair, used, 3, "Knee physiotherapy review");
        bookUpcoming(nadeesha, kim, used, 1, "Cough review");
        bookUpcoming(aisha, zahra, used, 2, "Cardiac risk assessment");
        bookUpcoming(john, wu, used, 4, "Blood pressure check");
        bookUpcoming(maya, kim, used, 3, "Annual wellness visit");

        // ------------------------------------------------------------- pharmacy
        Medicine paracetamol = medicine("Paracetamol 500mg", "MED-PARA-500", "Analgesic",
                "GSK", "tablet", "12.50", 100, 640, today.plusMonths(18), "B-PAR-241");
        Medicine amoxicillin = medicine("Amoxicillin 500mg", "MED-AMOX-500", "Antibiotic",
                "Cipla", "capsule", "45.00", 80, 420, today.plusMonths(10), "B-AMX-118");
        Medicine metformin = medicine("Metformin 500mg", "MED-METF-500", "Antidiabetic",
                "USV", "tablet", "18.00", 120, 980, today.plusMonths(24), "B-MET-552");
        Medicine atorvastatin = medicine("Atorvastatin 10mg", "MED-ATOR-10", "Statin",
                "Pfizer", "tablet", "62.00", 60, 260, today.plusMonths(14), "B-ATV-901");
        Medicine amlodipine = medicine("Amlodipine 5mg", "MED-AMLO-5", "Antihypertensive",
                "Novartis", "tablet", "22.00", 70, 18, today.plusMonths(9), "B-AML-330");
        Medicine omeprazole = medicine("Omeprazole 20mg", "MED-OMEP-20", "Gastro",
                "AstraZeneca", "capsule", "28.00", 50, 300, today.plusMonths(16), "B-OMP-220");
        Medicine ibuprofen = medicine("Ibuprofen 400mg", "MED-IBU-400", "NSAID",
                "Abbott", "tablet", "15.00", 90, 12, today.plusMonths(7), "B-IBU-119");
        Medicine cetirizine = medicine("Cetirizine 10mg", "MED-CET-10", "Antihistamine",
                "Dr Reddy's", "tablet", "9.00", 100, 520, today.plusMonths(20), "B-CET-770");
        Medicine salbutamol = medicine("Salbutamol Inhaler", "MED-SAL-INH", "Respiratory",
                "GSK", "inhaler", "485.00", 25, 46, today.plusMonths(12), "B-SAL-061");
        Medicine aspirin = medicine("Aspirin 75mg", "MED-ASP-75", "Anti-platelet",
                "Bayer", "tablet", "6.50", 150, 240, today.plusMonths(15), "B-ASP-75");
        Medicine vitaminD = medicine("Vitamin D3 1000IU", "MED-VITD-1000", "Supplement",
                "Solgar", "capsule", "34.00", 60, 210, today.plusMonths(22), "B-VTD-448");
        Medicine insulin = medicine("Insulin Glargine", "MED-INS-GLA", "Antidiabetic",
                "Sanofi", "vial", "1850.00", 12, 22, today.plusMonths(5), "B-INS-882");
        medicine("Congestive Cough Syrup", "MED-COUGH-100", "Respiratory",
                "Hemas", "bottle", "420.00", 20, 55, today.plusMonths(11), "B-CGH-104");

        // ---------------------------------------------------------------- labs
        LabTest cbc = labTest("CBC", "Complete Blood Count", "Haematology", "1850.00", "Blood",
                "4.0 - 11.0 x10^9/L", "x10^9/L", 6);
        LabTest lipid = labTest("LIPID", "Lipid Profile", "Biochemistry", "2400.00", "Blood",
                "LDL < 130 mg/dL", "mg/dL", 8);
        LabTest hba1c = labTest("HBA1C", "HbA1c", "Biochemistry", "2100.00", "Blood",
                "4.0 - 5.6 %", "%", 8);
        LabTest tsh = labTest("TSH", "Thyroid Stimulating Hormone", "Biochemistry", "1950.00", "Blood",
                "0.4 - 4.0 mIU/L", "mIU/L", 12);
        LabTest urine = labTest("URINE", "Urinalysis", "Microbiology", "950.00", "Urine",
                "Negative for protein and glucose", null, 4);
        labTest("CXR", "Chest X-Ray", "Radiology", "3200.00", "Imaging", "No active lung lesion", null, 24);
        labTest("ECG", "Electrocardiogram", "Cardiology", "1800.00", "Imaging", "Normal sinus rhythm", "bpm", 2);
        labTest("VITD", "Vitamin D (25-OH)", "Biochemistry", "4200.00", "Blood",
                "30 - 100 ng/mL", "ng/mL", 24);

        LabOrder lab1 = labOrder(john, reed, cbc, LabOrderStatus.COMPLETED, LabPriority.ROUTINE,
                today.minusDays(29).atTime(10, 30), "7.2", "x10^9/L", "4.0 - 11.0 x10^9/L",
                "Mild leukocytosis, repeat in two weeks", "Nimal Perera");
        LabOrder lab2 = labOrder(john, reed, lipid, LabOrderStatus.COMPLETED, LabPriority.ROUTINE,
                today.minusDays(29).atTime(10, 30), "168", "mg/dL", "LDL < 130 mg/dL",
                "LDL above target - statin started", "Nimal Perera");
        labOrder(maya, wu, tsh, LabOrderStatus.ORDERED, LabPriority.ROUTINE,
                today.minusDays(1).atTime(9, 15), null, null, null, null, null);
        labOrder(omar, ortiz, tsh, LabOrderStatus.COLLECTED, LabPriority.ROUTINE,
                today.minusDays(2).atTime(11, 0), null, null, null, null, "Kumari Silva");
        labOrder(aisha, zahra, cbc, LabOrderStatus.COMPLETED, LabPriority.ROUTINE,
                today.minusDays(10).atTime(13, 30), "6.1", "x10^9/L", "4.0 - 11.0 x10^9/L",
                "Within normal limits", "Nimal Perera");
        labOrder(nadeesha, kim, urine, LabOrderStatus.COMPLETED, LabPriority.URGENT,
                today.minusDays(7).atTime(15, 20), "Clear, no protein", null,
                "Negative for protein and glucose", "Viral URTI, no bacterial growth", "Kumari Silva");

        // ---------------------------------------------------------------- wards
        Ward icu = ward("Intensive Care Unit", "Critical care", "Level 3", "Six-bed ICU with 24/7 intensivist cover.");
        Ward generalWard = ward("General Medical Ward", "General", "Level 2", "Adult medical and post-operative beds.");
        Ward maternity = ward("Maternity Ward", "Maternity", "Level 2", "Antenatal, delivery and postnatal rooms.");
        Ward paediatric = ward("Paediatric Ward", "Paediatric", "Level 1", "Child-friendly rooms with parent beds.");

        List<Bed> icuBeds = beds(icu, 4, "ICU", "18500.00");
        List<Bed> generalBeds = beds(generalWard, 8, "GM", "9500.00");
        beds(maternity, 4, "MAT", "12000.00");
        List<Bed> paediatricBeds = beds(paediatric, 4, "PAED", "8000.00");

        Admission adm1 = admit(omar, ortiz, icuBeds.get(0), "Transient ischaemic attack - observation",
                "Admitted for 24-hour telemetry and stroke work-up.");
        bedOccupied(icuBeds.get(0));
        Admission adm2 = admit(maya, wu, generalBeds.get(1), "Hyperglycaemia - stabilisation",
                "Started on a sliding-scale insulin regimen.");
        bedOccupied(generalBeds.get(1));
        Admission adm3 = admit(nadeesha, kim, paediatricBeds.get(0), "Bronchiolitis - supportive care",
                "Oxygen and hydration; parents staying with the child.");
        bedOccupied(paediatricBeds.get(0));
        Admission discharged = admit(liam, nair, generalBeds.get(4), "Knee arthroscopy - day 1 post-op",
                "Physiotherapy started on day one.");
        discharged.setAdmittedAt(LocalDateTime.now().minusDays(6).withHour(11).withMinute(0));
        discharged.setDischargedAt(LocalDateTime.now().minusDays(3).withHour(10).withMinute(0));
        discharged.setStatus(AdmissionStatus.DISCHARGED);
        admissionRepository.save(discharged);
        generalBeds.get(4).setStatus(com.meridian.hms.domain.Enums.BedStatus.AVAILABLE);
        bedRepository.save(generalBeds.get(4));
        billingService.createForAdmission(discharged, 3, nair.getConsultationFee());

        leaveRepository.save(new DoctorLeave(ortiz, today.plusDays(10), today.plusDays(12),
                "Annual conference - European Neurology Congress"));
        DoctorLeave pending = new DoctorLeave(wu, today.plusDays(5), today.plusDays(6),
                "Family commitment");
        pending.setStatus(LeaveStatus.PENDING);
        leaveRepository.save(pending);

        // ---------------------------------------------------------- notifications
        notification(john.getUser(), "Welcome to Meridian",
                "Your patient portal is ready. Book appointments, read results and pay invoices online.",
                NotificationType.SYSTEM, "/patient");
        notification(admin, "Pharmacy stock alert",
                "Ibuprofen 400mg and Amlodipine 5mg are at or below their reorder level.",
                NotificationType.PHARMACY, "/admin/pharmacy");
        notification(reed.getUser(), "Lab results ready",
                "John Doe's Complete Blood Count and Lipid Profile results are available.",
                NotificationType.LAB, "/doctor/lab");
        notification(reed.getUser(), "Tomorrow's clinic",
                "You have a follow-up consultation with John Doe tomorrow. Review the chart before the visit.",
                NotificationType.APPOINTMENT, "/doctor");
        notification(maya.getUser(), "Payment received",
                "We received Rs. 1000.00 against invoice " + i2.getInvoiceNumber() + ".",
                NotificationType.BILLING, "/patient/invoices");
        notification(omar.getUser(), "Admission in progress",
                "You are admitted to the Intensive Care Unit for observation. Your care team is notified.",
                NotificationType.ADMISSION, "/patient/admissions");

        // ---------------------------------------------------------------- audit
        audit(admin.getName(), "ADMIN", "CREATE_STAFF", "User", String.valueOf(reed.getUser().getId()),
                "Provisioned Dr. Alice Reed with Cardiology privileges");
        audit(admin.getName(), "ADMIN", "CREATE_DEPARTMENT", "Department", String.valueOf(cardiology.getId()),
                "Created Cardiology department");
        audit(reed.getUser().getName(), "DOCTOR", "COMPLETE_APPOINTMENT", "Appointment", String.valueOf(a1.getId()),
                "Completed consultation and generated invoice " + i1.getInvoiceNumber());
        audit(reed.getUser().getName(), "DOCTOR", "CREATE_MEDICAL_RECORD", "MedicalRecord",
                String.valueOf(recordVisit1.getId()), "Recorded diagnosis and issued a prescription");
        audit(wu.getUser().getName(), "DOCTOR", "ORDER_LAB_TEST", "LabOrder", String.valueOf(lab1.getId()),
                "Ordered Complete Blood Count");
        audit(admin2.getName(), "ADMIN", "DISPENSE_PRESCRIPTION", "Dispense", "1",
                "Dispensed prescription for John Doe");

        log.info("Seeded {} users, {} appointments, {} invoices, {} medicines, {} beds",
                userRepository.count(), appointmentRepository.count(), invoiceRepository.count(),
                medicineRepository.count(), bedRepository.count());
    }

    // ------------------------------------------------------------- seed helpers

    private Department department(String name, String icon, BigDecimal fee, String description) {
        Department department = new Department(name,
                name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", ""),
                description, fee);
        return departmentRepository.save(department);
    }

    private User user(String name, String email, Role role, String phone) {
        User user = new User(name, email, passwordEncoder.encode(seedPassword), role, phone);
        return userRepository.save(user);
    }

    @SafeVarargs
    private Doctor doctor(String name, String email, Department department, String specialization,
                          BigDecimal fee, int experience, String bio, List<DoctorAvailability>... slotGroups) {
        User user = user(name, email, Role.DOCTOR, "+94 11 234 5678");
        Doctor doctor = new Doctor(user, specialization, department, fee);
        doctor.setExperienceYears(experience);
        doctor.setBio(bio);
        doctor.setLicenseNo("SLMC-" + (10000 + (int) (Math.random() * 80000)));
        for (List<DoctorAvailability> slots : slotGroups) {
            for (DoctorAvailability slot : slots) {
                slot.setDoctor(doctor);
                doctor.getAvailableSlots().add(slot);
            }
        }
        return doctorRepository.save(doctor);
    }

    private Patient patient(String name, String email, LocalDate dob, Gender gender, String bloodGroup,
                            String address, String allergies, String phone) {
        User user = user(name, email, Role.PATIENT, phone);
        Patient patient = new Patient(user);
        patient.setDob(dob);
        patient.setGender(gender);
        patient.setBloodGroup(bloodGroup);
        patient.setAddress(address);
        patient.setAllergies(allergies);
        patient.setEmergencyContact(phone);
        return patientRepository.save(patient);
    }

    /** varargs of int[7] triplets: day, startHour, startMinute... built by slots(). */
    private List<DoctorAvailability> slots(int fromDay, int toDay, int startHour, int startMinute,
                                           int endHour, int endMinute, int minutes) {
        List<DoctorAvailability> list = new ArrayList<>();
        for (int day = fromDay; day <= toDay; day++) {
            list.add(new DoctorAvailability(null, day, LocalTime.of(startHour, startMinute),
                    LocalTime.of(endHour, endMinute), minutes));
        }
        return list;
    }

    private Appointment appointment(Patient patient, Doctor doctor, LocalDateTime when,
                                    AppointmentStatus status, String reason) {
        Appointment appointment = new Appointment(patient, doctor, when, 30, reason);
        appointment.setStatus(status);
        appointment.setFee(doctor.getConsultationFee());
        appointment.setTokenNumber((int) (appointmentRepository.count() % 12) + 1);
        if (status == AppointmentStatus.COMPLETED) {
            appointment.setNotes("Visit completed");
        }
        return appointmentRepository.save(appointment);
    }

    private Appointment bookUpcoming(Patient patient, Doctor doctor, Set<String> used, int minDays, String reason) {
        LocalDate today = LocalDate.now();
        for (int offset = minDays; offset <= minDays + 21; offset++) {
            LocalDate day = today.plusDays(offset);
            int dow = day.getDayOfWeek().getValue();
            for (DoctorAvailability window : doctor.getAvailableSlots()) {
                if (window.getDayOfWeek() != dow) {
                    continue;
                }
                LocalTime cursor = window.getStartTime();
                while (!cursor.plusMinutes(30).isAfter(window.getEndTime())) {
                    String key = doctor.getId() + "@" + day + "T" + cursor;
                    if (!used.contains(key) && day.atTime(cursor).isAfter(LocalDateTime.now())) {
                        used.add(key);
                        Appointment appointment = new Appointment(patient, doctor,
                                day.atTime(cursor), 30, reason);
                        appointment.setFee(doctor.getConsultationFee());
                        long dayCount = appointmentRepository.countByDoctorIdAndDateTimeBetween(
                                doctor.getId(), day.atStartOfDay(), day.plusDays(1).atStartOfDay());
                        appointment.setTokenNumber((int) dayCount + 1);
                        return appointmentRepository.save(appointment);
                    }
                    cursor = cursor.plusMinutes(30);
                }
            }
        }
        return null;
    }

    private MedicalRecord record(Patient patient, Doctor doctor, Appointment appointment, String diagnosis,
                                 String symptoms, String bp, int pulse, double temp, double weight,
                                 double height, int spo2, String notes, LocalDate followUp,
                                 String advice, List<Prescription.PrescriptionItem> items, List<String> labCodes) {
        MedicalRecord record = new MedicalRecord();
        record.setAppointment(appointment);
        record.setPatient(patient);
        record.setDoctor(doctor);
        record.setDiagnosis(diagnosis);
        record.setSymptoms(symptoms);
        record.setBloodPressure(bp);
        record.setPulse(pulse);
        record.setTemperature(temp);
        record.setWeight(weight);
        record.setHeight(height);
        record.setSpo2(spo2);
        record.setNotes(notes);
        record.setFollowUpDate(followUp);
        record = recordRepository.save(record);

        Prescription prescription = new Prescription();
        prescription.setMedicalRecord(record);
        prescription.setPatient(patient);
        prescription.setDoctor(doctor);
        prescription.setAdvice(advice);
        prescription.setItems(new ArrayList<>(items));
        record.setPrescription(prescriptionRepository.save(prescription));
        recordRepository.save(record);

        for (String code : labCodes) {
            labTestRepository.findByCodeIgnoreCase(code).ifPresent(test -> {
                LabOrder order = new LabOrder(patient, doctor, test, LabPriority.ROUTINE);
                order.setStatus(LabOrderStatus.COMPLETED);
                order.setOrderedAt(appointment.getDateTime());
                order.setCollectedAt(appointment.getDateTime().plusMinutes(20));
                order.setCompletedAt(appointment.getDateTime().plusHours(3));
                order.setResultValue(test.getCode().equals("HBA1C") ? "7.9" : "Within range");
                order.setResultUnit(test.getUnit());
                order.setReferenceRange(test.getReferenceRange());
                order.setRemarks("Reviewed by the treating doctor.");
                order.setTechnician("Nimal Perera");
                labOrderRepository.save(order);
            });
        }
        return record;
    }

    private Prescription.PrescriptionItem rx(String name, String dosage, String frequency,
                                             int days, int qty, String instructions) {
        Prescription.PrescriptionItem item = new Prescription.PrescriptionItem();
        item.setMedicineName(name);
        item.setDosage(dosage);
        item.setFrequency(frequency);
        item.setDurationDays(days);
        item.setQuantity(qty);
        item.setInstructions(instructions);
        return item;
    }

    private void pay(Invoice invoice, BigDecimal amount, InvoiceStatus status) {
        invoice.getPayments().add(new Invoice.Payment(amount,
                status == InvoiceStatus.PAID ? com.meridian.hms.domain.Enums.PaymentMethod.CARD
                        : com.meridian.hms.domain.Enums.PaymentMethod.CASH,
                "TXN-" + (100000 + (int) (Math.random() * 899999)),
                LocalDateTime.now().minusDays(2), "Front desk"));
        invoice.setAmountPaid(amount);
        invoice.setStatus(status);
        invoiceRepository.save(invoice);
    }

    private Medicine medicine(String name, String sku, String category, String manufacturer, String unit,
                              String price, int reorder, int stock, LocalDate expiry, String batchNo) {
        Medicine medicine = new Medicine(name, sku, category, manufacturer, unit,
                new BigDecimal(price), reorder);
        medicine = medicineRepository.save(medicine);
        if (stock > 0 && batchNo != null) {
            batchRepository.save(new StockBatch(medicine, batchNo, expiry, stock));
            movementRepository.save(new StockMovement(medicine, com.meridian.hms.domain.Enums.StockMovementType.IN,
                    stock, "Opening stock", "BATCH-OPEN", "System"));
        }
        medicine.setStockQuantity(stock);
        return medicineRepository.save(medicine);
    }

    private LabTest labTest(String code, String name, String category, String price, String sampleType,
                            String range, String unit, int hours) {
        return labTestRepository.save(new LabTest(code, name, category, new BigDecimal(price),
                sampleType, range, unit, hours));
    }

    private LabOrder labOrder(Patient patient, Doctor doctor, LabTest test, LabOrderStatus status,
                              LabPriority priority, LocalDateTime orderedAt, String value, String unit,
                              String range, String remarks, String technician) {
        LabOrder order = new LabOrder(patient, doctor, test, priority);
        order.setStatus(status);
        order.setOrderedAt(orderedAt);
        if (status != LabOrderStatus.ORDERED) {
            order.setCollectedAt(orderedAt.plusMinutes(25));
            order.setTechnician(technician);
        }
        if (status == LabOrderStatus.COMPLETED) {
            order.setCompletedAt(orderedAt.plusHours(3));
            order.setResultValue(value);
            order.setResultUnit(unit);
            order.setReferenceRange(range);
            order.setRemarks(remarks);
        }
        return labOrderRepository.save(order);
    }

    private Ward ward(String name, String type, String floor, String description) {
        return wardRepository.save(new Ward(name, type, floor, description));
    }

    private List<Bed> beds(Ward ward, int count, String prefix, String charge) {
        List<Bed> beds = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            beds.add(bedRepository.save(new Bed(ward, prefix + "-" + String.format("%02d", i),
                    new BigDecimal(charge))));
        }
        return beds;
    }

    private Admission admit(Patient patient, Doctor doctor, Bed bed, String diagnosis, String notes) {
        bed.setStatus(BedStatus.OCCUPIED);
        bedRepository.save(bed);
        Admission admission = new Admission(patient, doctor, bed, diagnosis, notes);
        admission.setAdmittedAt(LocalDateTime.now().minusDays(2).withHour(9).withMinute(30));
        return admissionRepository.save(admission);
    }

    private void bedOccupied(Bed bed) {
        bed.setStatus(BedStatus.OCCUPIED);
        bedRepository.save(bed);
    }

    private void notification(User user, String title, String message, NotificationType type, String link) {
        notificationRepository.save(new Notification(user, title, message, type, link));
    }

    private void audit(String actor, String role, String action, String entity, String entityId, String details) {
        auditLogRepository.save(new AuditLog(actor, role, action, entity, entityId, details, "127.0.0.1"));
    }
}
