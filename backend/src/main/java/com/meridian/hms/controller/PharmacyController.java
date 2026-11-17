package com.meridian.hms.controller;

import com.meridian.hms.audit.Audited;
import com.meridian.hms.common.ApiResponse;
import com.meridian.hms.domain.Dispense;
import com.meridian.hms.domain.Medicine;
import com.meridian.hms.domain.StockBatch;
import com.meridian.hms.domain.StockMovement;
import com.meridian.hms.dto.Requests.DispenseRequest;
import com.meridian.hms.dto.Requests.MedicineRequest;
import com.meridian.hms.dto.Requests.StockRequest;
import com.meridian.hms.security.AuthUser;
import com.meridian.hms.service.PharmacyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pharmacy")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    public record StockAdjustment(@jakarta.validation.constraints.Min(0) int quantity,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=500) String reason) {}

    @PatchMapping("/batches/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @Audited(action="WRITE_OFF_STOCK", entity="StockBatch")
    public ApiResponse<StockBatch> adjust(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
            @Valid @RequestBody StockAdjustment request) {
        return ApiResponse.ok(pharmacyService.adjustStock(user,id,request.quantity(),request.reason()));
    }

    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @GetMapping("/medicines")
    public ApiResponse<List<Medicine>> medicines(@RequestParam(required = false) String search,
                                                 @RequestParam(defaultValue = "false") boolean lowStock,
                                                 @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ApiResponse.ok(pharmacyService.list(search, lowStock, includeInactive));
    }

    @GetMapping("/medicines/{id}")
    public ApiResponse<Medicine> medicine(@PathVariable Long id) {
        return ApiResponse.ok(pharmacyService.get(id));
    }

    @PostMapping("/medicines")
    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @Audited(action = "CREATE_MEDICINE", entity = "Medicine")
    public ApiResponse<Medicine> create(@Valid @RequestBody MedicineRequest request) {
        return ApiResponse.ok(pharmacyService.create(request));
    }

    @PatchMapping("/medicines/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @Audited(action = "UPDATE_MEDICINE", entity = "Medicine")
    public ApiResponse<Medicine> update(@PathVariable Long id, @Valid @RequestBody MedicineRequest request) {
        return ApiResponse.ok(pharmacyService.update(id, request));
    }

    @PostMapping("/medicines/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @Audited(action = "RECEIVE_STOCK", entity = "Medicine")
    public ApiResponse<StockBatch> addStock(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                            @Valid @RequestBody StockRequest request) {
        return ApiResponse.ok(pharmacyService.addStock(user, id, request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @GetMapping("/medicines/{id}/batches")
    public ApiResponse<List<StockBatch>> batches(@PathVariable Long id) {
        return ApiResponse.ok(pharmacyService.batches(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @GetMapping("/movements")
    public ApiResponse<List<StockMovement>> movements(@RequestParam(required = false) Long medicineId,
                                                      @RequestParam(defaultValue = "100") int limit) {
        return ApiResponse.ok(pharmacyService.movements(medicineId, limit));
    }

    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @GetMapping("/alerts")
    public ApiResponse<Map<String, Object>> alerts() {
        Map<String, Object> alerts = new LinkedHashMap<>();
        alerts.put("lowStock", pharmacyService.list(null, true, false));
        alerts.put("expiringSoon", pharmacyService.expiringSoon(90));
        return ApiResponse.ok(alerts);
    }

    @PostMapping("/dispense")
    @PreAuthorize("hasAnyRole('ADMIN','PHARMACIST')")
    @Audited(action = "DISPENSE_PRESCRIPTION", entity = "Dispense")
    public ApiResponse<Map<String, Object>> dispense(@AuthenticationPrincipal AuthUser user,
                                                     @Valid @RequestBody DispenseRequest request) {
        return ApiResponse.ok(pharmacyService.dispense(user, request));
    }

    @GetMapping("/dispenses")
    public ApiResponse<List<Dispense>> dispenses(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(pharmacyService.dispenses(user));
    }
}
