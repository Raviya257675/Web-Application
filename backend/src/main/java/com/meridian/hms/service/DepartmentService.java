package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Department;
import com.meridian.hms.domain.Doctor;
import com.meridian.hms.dto.Requests.DepartmentRequest;
import com.meridian.hms.repository.DepartmentRepository;
import com.meridian.hms.repository.DoctorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;

    public DepartmentService(DepartmentRepository departmentRepository, DoctorRepository doctorRepository) {
        this.departmentRepository = departmentRepository;
        this.doctorRepository = doctorRepository;
    }

    public List<Department> list(boolean includeInactive) {
        List<Department> departments = includeInactive
                ? departmentRepository.findAllByOrderByNameAsc()
                : departmentRepository.findByActiveTrueOrderByNameAsc();
        departments.forEach(d -> d.setDoctorCount(doctorRepository.countByDepartmentIdAndActiveTrue(d.getId())));
        return departments;
    }

    public Department get(Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Department"));
        department.setDoctorCount(doctorRepository.countByDepartmentIdAndActiveTrue(id));
        return department;
    }

    @Transactional
    public Department create(DepartmentRequest request) {
        if (departmentRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw ApiException.conflict("DEPARTMENT_EXISTS", "A department with that name already exists");
        }
        Department department = new Department(request.name().trim(), uniqueSlug(request.name()),
                request.description(),
                request.consultationFee() == null ? BigDecimal.ZERO : request.consultationFee());
        if (request.active() != null) {
            department.setActive(request.active());
        }
        return departmentRepository.save(department);
    }

    @Transactional
    public Department update(Long id, DepartmentRequest request) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Department"));
        if (!department.getName().equalsIgnoreCase(request.name().trim())
                && departmentRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw ApiException.conflict("DEPARTMENT_EXISTS", "A department with that name already exists");
        }
        department.setName(request.name().trim());
        department.setSlug(uniqueSlug(request.name()));
        department.setDescription(request.description());
        if (request.consultationFee() != null) {
            department.setConsultationFee(request.consultationFee());
        }
        if (request.active() != null) {
            department.setActive(request.active());
        }
        return departmentRepository.save(department);
    }

    /** Departments with doctors are deactivated (never orphaned); empty ones are removed. */
    @Transactional
    public void delete(Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Department"));
        long attached = doctorRepository.countByDepartmentIdAndActiveTrue(id);
        if (attached > 0) {
            department.setActive(false);
            departmentRepository.save(department);
        } else {
            departmentRepository.delete(department);
        }
    }

    private String uniqueSlug(String name) {
        String base = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isBlank()) {
            base = "department";
        }
        String slug = base;
        int i = 2;
        while (departmentRepository.existsBySlug(slug)) {
            slug = base + "-" + i++;
        }
        return slug;
    }
}
