package com.meridian.hms.controller;

import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.dto.Dtos.AvailabilityResponse;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorRepository;
import com.meridian.hms.repository.PatientRepository;
import com.meridian.hms.service.DoctorService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Unauthenticated content for the public landing page. */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DoctorService doctorService;

    public PublicController(DepartmentRepository departmentRepository, DoctorRepository doctorRepository,
                            PatientRepository patientRepository, DoctorService doctorService) {
        this.departmentRepository = departmentRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.doctorService = doctorService;
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("departments", departmentRepository.findByActiveTrueOrderByNameAsc().size());
        stats.put("doctors", doctorRepository.countByActiveTrue());
        stats.put("patients", patientRepository.count());
        stats.put("years", 18);
        return ApiResponse.ok(stats);
    }

    @GetMapping("/departments")
    public ApiResponse<List<Map<String, Object>>> departments() {
        return ApiResponse.ok(departmentRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::departmentView).toList());
    }

    @GetMapping("/doctors")
    public ApiResponse<List<Map<String, Object>>> doctors(@RequestParam(required = false) Long departmentId) {
        List<Doctor> doctors = departmentId == null
                ? doctorRepository.findByActiveTrueOrderByUser_NameAsc()
                : doctorRepository.findByDepartmentIdAndActiveTrueOrderByUser_NameAsc(departmentId);
        return ApiResponse.ok(doctors.stream().map(this::doctorView).toList());
    }

    @GetMapping("/doctors/{id}/availability")
    public ApiResponse<AvailabilityResponse> availability(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(doctorService.availability(id, date));
    }

    private Map<String, Object> departmentView(Department department) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", department.getId());
        map.put("name", department.getName());
        map.put("slug", department.getSlug());
        map.put("description", department.getDescription());
        map.put("consultationFee", department.getConsultationFee());
        map.put("doctorCount", doctorRepository.countByDepartmentIdAndActiveTrue(department.getId()));
        return map;
    }

    private Map<String, Object> doctorView(Doctor doctor) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", doctor.getId());
        map.put("name", doctor.getUser().getName());
        map.put("specialization", doctor.getSpecialization());
        map.put("department", doctor.getDepartment().getName());
        map.put("departmentId", doctor.getDepartment().getId());
        map.put("consultationFee", doctor.getConsultationFee());
        map.put("experienceYears", doctor.getExperienceYears());
        map.put("bio", doctor.getBio());
        map.put("email", doctor.getUser().getEmail());
        return map;
    }
}
