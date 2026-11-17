package com.meridian.hms;

import com.fasterxml.jackson.databind.*;
import com.meridian.hms.domain.*;
import com.meridian.hms.domain.Enums.*;
import com.meridian.hms.repository.*;
import com.meridian.hms.security.JwtService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:role-workflows;DB_CLOSE_DELAY=-1","app.seed.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class RoleWorkflowTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PatientRepository patients;
    @Autowired DoctorRepository doctors;
    @Autowired DepartmentRepository departments;
    @Autowired AppointmentRepository appointments;
    @Autowired InvoiceRepository invoices;
    @Autowired MedicineRepository medicines;
    @Autowired StockBatchRepository batches;
    @Autowired MedicalRecordRepository records;
    @Autowired PrescriptionRepository prescriptions;
    @Autowired DispenseRepository dispenses;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    Map<Role,String> tokens;
    Patient patient;
    Doctor doctor;
    Department department;
    String suffix;
    @BeforeEach void fixtures() {
        suffix=UUID.randomUUID().toString().substring(0,8);
        tokens=new EnumMap<>(Role.class);
        department=departments.save(new Department("Department "+suffix,"dept-"+suffix,"Test department",new BigDecimal("100")));
        for(Role role:Role.values()) {
            User u=users.save(new User(role.name()+suffix,role.name().toLowerCase()+suffix+"@example.com",encoder.encode("TestPassword456!"),role,"0771234567"));
            tokens.put(role,jwt.generateAccessToken(u.getId(),role.name()));
            if(role==Role.PATIENT) {patient=new Patient(u);patient.setAllergies("PRIVATE ALLERGY");patient=patients.save(patient);}
            if(role==Role.DOCTOR) {
                doctor=new Doctor(u,"General practice",department,new BigDecimal("100"));
                for(int day=1;day<=7;day++) doctor.getAvailableSlots().add(new DoctorAvailability(doctor,day,LocalTime.of(9,0),LocalTime.of(17,0),30));
                doctor=doctors.save(doctor);
            }
        }
    }
    JsonNode call(MockHttpServletRequestBuilder req,Role role,Object body,int status) throws Exception {
        if(role!=null)req.header("Authorization","Bearer "+tokens.get(role));
        if(body!=null)req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        String text=mvc.perform(req).andExpect(status().is(status)).andReturn().getResponse().getContentAsString();
        return text.isEmpty()?json.createObjectNode():json.readTree(text);
    }
    @Test void allStaffRolesRequireApprovalBeforeLogin() throws Exception {
        var adminEmail="new-admin"+suffix+"@example.com";
        var admin=call(post("/api/auth/register"),null,Map.of("name","New Administrator","email",adminEmail,"password","TestPassword456!","role","ADMIN"),200);
        assertThat(admin.at("/data/active").asBoolean()).isTrue();
        assertThat(admin.at("/data/approvalStatus").asText()).isEqualTo("APPROVED");
        call(post("/api/auth/login"),null,Map.of("email",adminEmail,"password","TestPassword456!"),200);
        for(Role role:List.of(Role.DOCTOR,Role.RECEPTIONIST,Role.PHARMACIST)) {
            String email="applicant-"+role+suffix+"@example.com";
            var body=Map.of("name","Applicant "+role,"email",email,"password","TestPassword456!","role",role,
                    "professionalLicense","LIC-123","departmentId",department.getId(),"specialization","General practice","active",true,"approvalStatus","APPROVED");
            JsonNode created=call(post("/api/auth/register"),null,body,200).path("data");
            assertThat(created.path("active").asBoolean()).isFalse();
            assertThat(created.path("approvalStatus").asText()).isEqualTo("PENDING");
            var login=Map.of("email",email,"password","TestPassword456!");
            assertThat(call(post("/api/auth/login"),null,login,403).at("/error/code").asText()).isEqualTo("APPROVAL_PENDING");
            long id=created.path("id").asLong();
            call(patch("/api/users/"+id+"/review"),Role.PATIENT,Map.of("approve",true),403);
            call(patch("/api/users/"+id+"/status"),Role.ADMIN,Map.of("active",true),409);
            call(patch("/api/users/"+id+"/review"),Role.ADMIN,Map.of("approve",true,"note","Verified credentials"),200);
            assertThat(call(post("/api/auth/login"),null,login,200).at("/data/user/role").asText()).isEqualTo(role.name());
            call(patch("/api/users/"+id+"/review"),Role.ADMIN,Map.of("approve",true),409);
        }
        call(post("/api/auth/register"),null,Map.of("name","Unlicensed","email","no-license"+suffix+"@example.com","password","TestPassword456!","role","PHARMACIST"),400);
    }
    @Test void rejectedApplicationsStayInactiveAndRoleBoundariesAreEnforced() throws Exception {
        long id=call(post("/api/auth/register"),null,Map.of("name","Applicant","email","rejected"+suffix+"@example.com","password","TestPassword456!","role","RECEPTIONIST"),200).at("/data/id").asLong();
        call(patch("/api/users/"+id+"/review"),Role.ADMIN,Map.of("approve",false),400);
        call(patch("/api/users/"+id+"/review"),Role.ADMIN,Map.of("approve",false,"note","No hospital affiliation"),200);
        assertThat(users.findById(id).orElseThrow().isActive()).isFalse();
        for(String path:List.of("/api/users","/api/medical-records","/api/pharmacy/movements","/api/patients","/api/billing")) call(get(path),Role.RECEPTIONIST,null,403);
        for(String path:List.of("/api/users","/api/medical-records","/api/reception/patients","/api/billing")) call(get(path),Role.PHARMACIST,null,403);
        call(get("/api/medical-records/prescriptions"),Role.PHARMACIST,null,200);
        call(get("/api/pharmacy/alerts"),Role.PHARMACIST,null,200);
        call(get("/api/reception/patients"),Role.PATIENT,null,403);
        call(get("/api/dashboard"),Role.RECEPTIONIST,null,200);
        call(get("/api/dashboard"),Role.PHARMACIST,null,200);
        JsonNode listed=call(get("/api/reception/patients").param("search",suffix),Role.RECEPTIONIST,null,200);
        assertThat(listed.toString()).doesNotContain("PRIVATE ALLERGY","passwordHash");
    }
    @Test void receptionCanRegisterBookRescheduleCheckInAndTakePayment() throws Exception {
        var newPatient=call(post("/api/reception/patients"),Role.RECEPTIONIST,Map.of("name","Walk in","email","walkin"+suffix+"@example.com","password","TestPassword456!","role","ADMIN"),200);
        assertThat(newPatient.at("/data/role").asText()).isEqualTo("PATIENT");
        LocalDateTime tomorrow=LocalDate.now().plusDays(1).atTime(10,0);
        var booking=Map.of("patientId",patient.getId(),"doctorId",doctor.getId(),"dateTime",tomorrow.toString(),"durationMinutes",30);
        long id=call(post("/api/reception/appointments"),Role.RECEPTIONIST,booking,200).at("/data/id").asLong();
        call(post("/api/reception/appointments"),Role.RECEPTIONIST,booking,409);
        call(patch("/api/reception/appointments/"+id+"/reschedule"),Role.RECEPTIONIST,Map.of("dateTime",tomorrow.plusHours(1).toString(),"durationMinutes",30),200);
        call(patch("/api/reception/appointments/"+id+"/check-in"),Role.RECEPTIONIST,Map.of(),409);
        Appointment a=appointments.findById(id).orElseThrow();a.setDateTime(LocalDateTime.now().minusMinutes(5));appointments.save(a);
        assertThat(call(patch("/api/reception/appointments/"+id+"/check-in"),Role.RECEPTIONIST,Map.of(),200).at("/data/checkedInAt").asText()).isNotBlank();
        call(patch("/api/appointments/"+id+"/complete"),Role.RECEPTIONIST,Map.of(),403);
        Invoice invoice=new Invoice();invoice.setInvoiceNumber("INV-"+suffix);invoice.setPatient(patient);invoice.setSubTotal(new BigDecimal("100"));invoice.setTotalAmount(new BigDecimal("100"));invoice=invoices.save(invoice);
        call(post("/api/reception/billing/"+invoice.getId()+"/pay"),Role.RECEPTIONIST,Map.of("amount",40,"method","CASH","reference","Receipt 1"),200);
        call(post("/api/reception/billing/"+invoice.getId()+"/pay"),Role.RECEPTIONIST,Map.of("amount",70,"method","CASH"),409);
        assertThat(call(post("/api/reception/billing/"+invoice.getId()+"/pay"),Role.RECEPTIONIST,Map.of("amount",60,"method","CASH"),200).at("/data/status").asText()).isEqualTo("PAID");
        mvc.perform(get("/api/reception/billing/"+invoice.getId()+"/pdf").header("Authorization","Bearer "+tokens.get(Role.RECEPTIONIST))).andExpect(status().isOk()).andExpect(content().contentType("application/pdf"));
    }
    @Test void pharmacyRejectsExpiredStockAndDuplicateDispensing() throws Exception {
        long medicineId=call(post("/api/pharmacy/medicines"),Role.PHARMACIST,Map.of("name","Medicine "+suffix,"sku","SKU-"+suffix,"price",10,"reorderLevel",5,"unit","tablet"),200).at("/data/id").asLong();
        call(post("/api/pharmacy/medicines/"+medicineId+"/stock"),Role.PHARMACIST,Map.of("batchNo","EXPIRED","quantity",10,"expiryDate",LocalDate.now().minusDays(1).toString()),400);
        Medicine medicine=medicines.findById(medicineId).orElseThrow();
        StockBatch expired=batches.save(new StockBatch(medicine,"OLD",LocalDate.now().minusDays(1),10));medicine.setStockQuantity(10);medicines.save(medicine);
        Appointment a=appointments.save(new Appointment(patient,doctor,LocalDateTime.now().minusDays(1),30,"Test"));
        MedicalRecord record=new MedicalRecord();record.setAppointment(a);record.setPatient(patient);record.setDoctor(doctor);record.setDiagnosis("Private diagnosis");record=records.save(record);
        Prescription rx=new Prescription();rx.setMedicalRecord(record);rx.setPatient(patient);rx.setDoctor(doctor);
        var item=new Prescription.PrescriptionItem();item.setMedicineName(medicine.getName());item.setQuantity(3);item.setDosage("As directed");rx.getItems().add(item);rx=prescriptions.save(rx);
        var dispense=Map.of("prescriptionId",rx.getId());
        call(post("/api/pharmacy/dispense"),Role.PHARMACIST,dispense,409);
        assertThat(dispenses.existsByPrescriptionId(rx.getId())).isFalse();
        assertThat(batches.findById(expired.getId()).orElseThrow().getQuantity()).isEqualTo(10);
        long usable=call(post("/api/pharmacy/medicines/"+medicineId+"/stock"),Role.PHARMACIST,Map.of("batchNo","NEW","quantity",10,"expiryDate",LocalDate.now().plusMonths(6).toString()),200).at("/data/id").asLong();
        call(post("/api/pharmacy/dispense"),Role.RECEPTIONIST,dispense,403);
        call(post("/api/pharmacy/dispense"),Role.PHARMACIST,dispense,200);
        assertThat(batches.findById(usable).orElseThrow().getQuantity()).isEqualTo(7);
        assertThat(batches.findById(expired.getId()).orElseThrow().getQuantity()).isEqualTo(10);
        call(post("/api/pharmacy/dispense"),Role.PHARMACIST,dispense,409);
        call(patch("/api/pharmacy/batches/"+expired.getId()),Role.PHARMACIST,Map.of("quantity",0,"reason","Expired stock disposal"),200);
        assertThat(medicines.findById(medicineId).orElseThrow().getStockQuantity()).isEqualTo(7);
        call(patch("/api/pharmacy/batches/"+usable),Role.PHARMACIST,Map.of("quantity",99,"reason","Invalid increase"),400);
    }
}
