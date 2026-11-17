package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Appointment;
import com.meridian.hms.domain.Enums.LabOrderStatus;
import com.meridian.hms.domain.Enums.LabPriority;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.LabOrder;
import com.meridian.hms.domain.LabTest;
import com.meridian.hms.domain.Patient;
import com.meridian.hms.dto.Requests.LabResultRequest;
import com.meridian.hms.dto.Requests.LabTestRequest;
import com.meridian.hms.repository.AppointmentRepository;
import com.meridian.hms.repository.LabOrderRepository;
import com.meridian.hms.repository.LabTestRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.security.AccessControl;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class LabService {

    private final LabTestRepository testRepository;
    private final LabOrderRepository orderRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final NotificationService notificationService;
    private final AccessControl accessControl;

    public LabService(LabTestRepository testRepository, LabOrderRepository orderRepository,
                      PatientRepository patientRepository, AppointmentRepository appointmentRepository,
                      NotificationService notificationService, AccessControl accessControl) {
        this.testRepository = testRepository;
        this.orderRepository = orderRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.notificationService = notificationService;
        this.accessControl = accessControl;
    }

    // ------------------------------------------------------------------ tests

    public List<LabTest> tests(boolean includeInactive) {
        return includeInactive ? testRepository.findAllByOrderByNameAsc() : testRepository.findByActiveTrueOrderByNameAsc();
    }

    @Transactional
    public LabTest createTest(LabTestRequest request) {
        if (testRepository.findByCodeIgnoreCase(request.code()).isPresent()) {
            throw ApiException.conflict("TEST_EXISTS", "A test with that code already exists");
        }
        LabTest test = new LabTest(request.code().trim().toUpperCase(), request.name().trim(),
                request.category(), request.price() == null ? java.math.BigDecimal.ZERO : request.price(),
                request.sampleType(), request.referenceRange(), request.unit(),
                request.turnaroundHours() == null ? 24 : request.turnaroundHours());
        return testRepository.save(test);
    }

    @Transactional
    public LabTest updateTest(Long id, LabTestRequest request) {
        LabTest test = testRepository.findById(id).orElseThrow(() -> ApiException.notFound("Lab test"));
        test.setName(request.name().trim());
        if (request.category() != null) test.setCategory(request.category());
        if (request.price() != null) test.setPrice(request.price());
        if (request.sampleType() != null) test.setSampleType(request.sampleType());
        if (request.referenceRange() != null) test.setReferenceRange(request.referenceRange());
        if (request.unit() != null) test.setUnit(request.unit());
        if (request.turnaroundHours() != null) test.setTurnaroundHours(request.turnaroundHours());
        if (request.active() != null) test.setActive(request.active());
        return testRepository.save(test);
    }

    // ----------------------------------------------------------------- orders

    @Transactional
    public LabOrder createOrder(AuthUser user, Long patientId, Long testId, Long appointmentId, LabPriority priority) {
        if (!user.isDoctor()) {
            throw ApiException.forbidden("FORBIDDEN", "Only a doctor can order a lab test");
        }
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> ApiException.notFound("Patient"));
        LabTest test = testRepository.findById(testId).orElseThrow(() -> ApiException.notFound("Lab test"));
        if (!test.isActive()) {
            throw ApiException.conflict("TEST_INACTIVE", "That test is no longer offered");
        }
        LabOrder order = new LabOrder(patient, accessControl.currentDoctor(user), test,
                priority == null ? LabPriority.ROUTINE : priority);
        if (appointmentId != null) {
            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
            order.setAppointment(appointment);
        }
        order.setStatus(LabOrderStatus.ORDERED);
        order = orderRepository.save(order);
        notificationService.send(patient.getUser(), "Lab test ordered",
                test.getName() + " has been ordered. Please visit the laboratory for sample collection.",
                NotificationType.LAB, "/patient/lab");
        return order;
    }

    @Transactional
    public LabOrder orderFor(AuthUser user, Long patientId, Long testId, LabPriority priority) {
        if (!user.isDoctor()) {
            throw ApiException.forbidden("FORBIDDEN", "Only a doctor can order a lab test");
        }
        if (!appointmentRepository.existsByPatientIdAndDoctorId(patientId, user.doctorId())) {
            throw ApiException.forbidden("PATIENT_ACCESS_DENIED",
                    "You can only order tests for patients you have treated");
        }
        return createOrder(user, patientId, testId, null, priority);
    }

    public List<LabOrder> orders(AuthUser user, String status) {
        List<LabOrder> orders;
        if (user.isAdmin()) {
            orders = orderRepository.findAllByOrderByOrderedAtDesc();
        } else if (user.isDoctor()) {
            orders = orderRepository.findByDoctorIdOrderByOrderedAtDesc(user.doctorId());
        } else {
            orders = orderRepository.findByPatientIdOrderByOrderedAtDesc(accessControl.currentPatient(user).getId());
        }
        if (status != null && !status.isBlank()) {
            LabOrderStatus wanted = LabOrderStatus.valueOf(status.toUpperCase());
            orders = new ArrayList<>(orders.stream().filter(o -> o.getStatus() == wanted).toList());
        }
        return orders;
    }

    public LabOrder get(AuthUser user, Long id) {
        LabOrder order = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Lab order"));
        if (user.isAdmin()
                || (user.isDoctor() && order.getDoctor().getId().equals(user.doctorId()))
                || (user.isPatient() && order.getPatient().getId().equals(user.patientId()))) {
            return order;
        }
        throw ApiException.forbidden("LAB_ACCESS_DENIED", "This lab order is not yours");
    }

    @Transactional
    public LabOrder collect(Long id, String technician) {
        LabOrder order = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Lab order"));
        if (order.getStatus() != LabOrderStatus.ORDERED) {
            throw ApiException.conflict("INVALID_STATE", "Only a newly ordered test can be collected");
        }
        order.setStatus(LabOrderStatus.COLLECTED);
        order.setCollectedAt(LocalDateTime.now());
        if (technician != null && !technician.isBlank()) {
            order.setTechnician(technician);
        }
        return orderRepository.save(order);
    }

    @Transactional
    public LabOrder complete(Long id, LabResultRequest request) {
        LabOrder order = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Lab order"));
        if (order.getStatus() == LabOrderStatus.CANCELLED) {
            throw ApiException.conflict("INVALID_STATE", "A cancelled order cannot receive results");
        }
        order.setResultValue(request.resultValue());
        if (request.resultUnit() != null) order.setResultUnit(request.resultUnit());
        if (request.referenceRange() != null) order.setReferenceRange(request.referenceRange());
        if (request.remarks() != null) order.setRemarks(request.remarks());
        order.setStatus(LabOrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        if (order.getCollectedAt() == null) {
            order.setCollectedAt(LocalDateTime.now());
        }
        order = orderRepository.save(order);
        notificationService.send(order.getPatient().getUser(), "Lab result ready",
                "Results for " + order.getTest().getName() + " are available in your portal.",
                NotificationType.LAB, "/patient/lab");
        notificationService.send(order.getDoctor().getUser(), "Lab result ready",
                order.getPatient().getUser().getName() + "'s " + order.getTest().getName() + " result is ready.",
                NotificationType.LAB, "/doctor/lab");
        return order;
    }

    @Transactional
    public LabOrder cancel(Long id) {
        LabOrder order = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Lab order"));
        if (order.getStatus() == LabOrderStatus.COMPLETED) {
            throw ApiException.conflict("INVALID_STATE", "A completed test cannot be cancelled");
        }
        order.setStatus(LabOrderStatus.CANCELLED);
        return orderRepository.save(order);
    }

    public long pendingCount() {
        return orderRepository.countByStatus(LabOrderStatus.ORDERED)
                + orderRepository.countByStatus(LabOrderStatus.COLLECTED);
    }
}
