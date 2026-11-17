package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Dispense;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.Enums.StockMovementType;
import com.meridian.hms.domain.Medicine;
import com.meridian.hms.domain.Prescription;
import com.meridian.hms.domain.StockBatch;
import com.meridian.hms.domain.StockMovement;
import com.meridian.hms.dto.Requests.DispenseRequest;
import com.meridian.hms.dto.Requests.MedicineRequest;
import com.meridian.hms.dto.Requests.StockRequest;
import com.meridian.hms.repository.DispenseRepository;
import com.meridian.hms.repository.MedicineRepository;
import com.meridian.hms.repository.PrescriptionRepository;
import com.meridian.hms.repository.StockBatchRepository;
import com.meridian.hms.repository.StockMovementRepository;
import com.meridian.hms.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PharmacyService {

    private final MedicineRepository medicineRepository;
    private final StockBatchRepository batchRepository;
    private final StockMovementRepository movementRepository;
    private final DispenseRepository dispenseRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final NotificationService notificationService;

    public PharmacyService(MedicineRepository medicineRepository, StockBatchRepository batchRepository,
                           StockMovementRepository movementRepository, DispenseRepository dispenseRepository,
                           PrescriptionRepository prescriptionRepository, NotificationService notificationService) {
        this.medicineRepository = medicineRepository;
        this.batchRepository = batchRepository;
        this.movementRepository = movementRepository;
        this.dispenseRepository = dispenseRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.notificationService = notificationService;
    }

    // -------------------------------------------------------------- catalogue

    public List<Medicine> list(String search, boolean lowStock, boolean includeInactive) {
        List<Medicine> medicines = lowStock ? medicineRepository.findLowStock()
                : includeInactive ? medicineRepository.findAllByOrderByNameAsc()
                : medicineRepository.findByActiveTrueOrderByNameAsc();
        if (search != null && !search.isBlank()) {
            String needle = search.toLowerCase(Locale.ROOT);
            medicines = new ArrayList<>(medicines.stream().filter(m ->
                    m.getName().toLowerCase(Locale.ROOT).contains(needle)
                            || m.getSku().toLowerCase(Locale.ROOT).contains(needle)
                            || (m.getCategory() != null && m.getCategory().toLowerCase(Locale.ROOT).contains(needle)))
                    .toList());
        }
        return medicines;
    }

    public Medicine get(Long id) {
        return medicineRepository.findById(id).orElseThrow(() -> ApiException.notFound("Medicine"));
    }

    @Transactional
    public Medicine create(MedicineRequest request) {
        if (medicineRepository.findBySkuIgnoreCase(request.sku()).isPresent()) {
            throw ApiException.conflict("SKU_TAKEN", "A medicine with that SKU already exists");
        }
        Medicine medicine = new Medicine(request.name().trim(), request.sku().trim().toUpperCase(),
                request.category(), request.manufacturer(),
                request.unit() == null ? "tablet" : request.unit(), request.price(),
                request.reorderLevel() == null ? 20 : request.reorderLevel());
        medicine.setDescription(request.description());
        if (request.active() != null) {
            medicine.setActive(request.active());
        }
        return medicineRepository.save(medicine);
    }

    @Transactional
    public Medicine update(Long id, MedicineRequest request) {
        Medicine medicine = get(id);
        medicine.setName(request.name().trim());
        if (request.category() != null) medicine.setCategory(request.category());
        if (request.manufacturer() != null) medicine.setManufacturer(request.manufacturer());
        if (request.unit() != null) medicine.setUnit(request.unit());
        if (request.price() != null) medicine.setPrice(request.price());
        if (request.reorderLevel() != null) medicine.setReorderLevel(request.reorderLevel());
        if (request.description() != null) medicine.setDescription(request.description());
        if (request.active() != null) medicine.setActive(request.active());
        return medicineRepository.save(medicine);
    }

    // ------------------------------------------------------------------ stock

    @Transactional
    public StockBatch addStock(AuthUser user, Long medicineId, StockRequest request) {
        Medicine medicine = medicineRepository.lockById(medicineId).orElseThrow(() -> ApiException.notFound("Medicine"));
        if (request.expiryDate() == null || !request.expiryDate().isAfter(LocalDate.now())) throw ApiException.badRequest("INVALID_EXPIRY", "Stock must have a future expiry date");
        if (batches(medicineId).stream().anyMatch(b -> b.getBatchNo().equalsIgnoreCase(request.batchNo().trim()))) throw ApiException.conflict("DUPLICATE_BATCH", "This batch number already exists for this medicine");
        if (request.quantity() <= 0) {
            throw ApiException.badRequest("INVALID_QUANTITY", "Quantity must be greater than zero");
        }
        StockBatch batch = new StockBatch(medicine, request.batchNo().trim(), request.expiryDate(), request.quantity());
        batch = batchRepository.save(batch);
        medicine.setStockQuantity(medicine.getStockQuantity() + request.quantity());
        medicineRepository.save(medicine);
        movementRepository.save(new StockMovement(medicine, StockMovementType.IN, request.quantity(),
                request.reason() == null ? "Stock received" : request.reason(),
                "BATCH-" + batch.getId(), user.name()));
        return batch;
    }

    public List<StockBatch> batches(Long medicineId) {
        return batchRepository.findByMedicineIdOrderByExpiryDateAsc(medicineId);
    }

    public List<StockMovement> movements(Long medicineId, int limit) {
        List<StockMovement> movements = medicineId == null
                ? movementRepository.findByOrderByCreatedAtDesc()
                : movementRepository.findByMedicineIdOrderByCreatedAtDesc(medicineId);
        return movements.stream().limit(limit <= 0 ? 100 : limit).toList();
    }

    public List<StockBatch> expiringSoon(int days) {
        return batchRepository.findByExpiryDateBeforeAndQuantityGreaterThanOrderByExpiryDateAsc(
                LocalDate.now().plusDays(days), 0);
    }

    // --------------------------------------------------------------- dispense

    @Transactional
    public Map<String, Object> dispense(AuthUser user, DispenseRequest request) {
        Prescription prescription = prescriptionRepository.lockById(request.prescriptionId())
                .orElseThrow(() -> ApiException.notFound("Prescription"));
        if (dispenseRepository.existsByPrescriptionId(prescription.getId())) throw ApiException.conflict("ALREADY_DISPENSED", "This prescription has already been dispensed");
        if (prescription.getItems().isEmpty()) {
            throw ApiException.badRequest("EMPTY_PRESCRIPTION", "That prescription has no medicines");
        }

        List<String> warnings = new ArrayList<>();
        Map<Medicine, Integer> plan = new LinkedHashMap<>();
        for (Prescription.PrescriptionItem item : prescription.getItems().stream().sorted(java.util.Comparator.comparing(Prescription.PrescriptionItem::getMedicineName)).toList()) {
            Medicine medicine = medicineRepository.findByNameIgnoreCase(item.getMedicineName()).orElse(null);
            if (medicine == null) {
                throw ApiException.conflict("MEDICINE_NOT_STOCKED", item.getMedicineName() + " is not stocked. No medicines have been dispensed.");
            }
            medicine = medicineRepository.lockById(medicine.getId()).orElseThrow(() -> ApiException.notFound("Medicine"));
            if (!medicine.isActive()) throw ApiException.conflict("INACTIVE_MEDICINE", medicine.getName() + " is inactive");
            int quantity = item.getQuantity() == null ? 1 : item.getQuantity();
            if (quantity <= 0) throw ApiException.badRequest("INVALID_QUANTITY", "Prescription quantities must be positive");
            int alreadyPlanned = plan.getOrDefault(medicine, 0);
            if (medicine.getStockQuantity() < alreadyPlanned + quantity) {
                throw ApiException.conflict("INSUFFICIENT_STOCK",
                        "Only " + medicine.getStockQuantity() + " " + medicine.getUnit()
                                + " of " + medicine.getName() + " in stock (needed " + (alreadyPlanned + quantity) + ")");
            }
            plan.put(medicine, alreadyPlanned + quantity);
        }
        if (plan.isEmpty()) {
            throw ApiException.conflict("NOTHING_TO_DISPENSE",
                    "None of the prescribed medicines exist in the pharmacy catalogue");
        }

        Dispense dispense = new Dispense();
        dispense.setPrescription(prescription);
        dispense.setPatient(prescription.getPatient());
        dispense.setDispensedBy(user.name());
        dispense.setNotes(request.notes());
        dispense = dispenseRepository.save(dispense);

        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Medicine, Integer> entry : plan.entrySet()) {
            Medicine medicine = entry.getKey();
            int quantity = entry.getValue();
            BigDecimal amount = medicine.getPrice().multiply(BigDecimal.valueOf(quantity));
            total = total.add(amount);
            dispense.getItems().add(new Dispense.DispenseItem(medicine.getName(), quantity, medicine.getPrice(), amount));
            deductStock(medicine, quantity, "DISP-" + dispense.getId(), user.name());
            medicine.setStockQuantity(medicine.getStockQuantity() - quantity);
            medicineRepository.save(medicine);
            if (medicine.getStockQuantity() <= medicine.getReorderLevel()) {
                notificationService.sendToRole(Role.PHARMACIST, "Low stock: " + medicine.getName(),
                        "Review inventory and replenish " + medicine.getName() + ".", NotificationType.PHARMACY, "/pharmacist");
                notificationService.sendToRole(Role.ADMIN, "Low stock: " + medicine.getName(),
                        medicine.getName() + " is down to " + medicine.getStockQuantity() + " "
                                + medicine.getUnit() + " (reorder level " + medicine.getReorderLevel() + ").",
                        NotificationType.PHARMACY, "/admin/pharmacy");
            }
        }
        dispense.setTotalAmount(total);
        dispense = dispenseRepository.save(dispense);

        notificationService.send(prescription.getPatient().getUser(), "Prescription dispensed",
                "Your medicines are ready. " + dispense.getItems().size() + " item(s), Rs. " + total + ".",
                NotificationType.PHARMACY, "/patient/prescriptions");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dispense", dispense);
        result.put("warnings", warnings);
        return result;
    }

    /** FEFO: earliest expiry leaves the shelf first. */
    private void deductStock(Medicine medicine, int quantity, String reference, String actor) {
        int remaining = quantity;
        List<StockBatch> batches = batchRepository
                .findByMedicineIdAndQuantityGreaterThanOrderByExpiryDateAsc(medicine.getId(), 0);
        for (StockBatch batch : batches) {
            if (batch.getExpiryDate() == null || batch.getExpiryDate().isBefore(LocalDate.now())) continue;
            if (remaining == 0) {
                break;
            }
            int take = Math.min(batch.getQuantity(), remaining);
            batch.setQuantity(batch.getQuantity() - take);
            batchRepository.save(batch);
            remaining -= take;
        }
        if (remaining > 0) throw ApiException.conflict("INSUFFICIENT_USABLE_STOCK", "Not enough unexpired stock for " + medicine.getName() + ". No medicines have been dispensed.");
        movementRepository.save(new StockMovement(medicine, StockMovementType.OUT, quantity,
                "Dispensed against prescription", reference, actor));
    }

    public List<Dispense> dispenses(AuthUser user) {
        if (user.isAdmin() || user.isPharmacist()) {
            return dispenseRepository.findByOrderByCreatedAtDesc();
        }
        if (user.isPatient()) {
            return dispenseRepository.findByPatientIdOrderByCreatedAtDesc(user.patientId());
        }
        throw ApiException.forbidden("FORBIDDEN", "Only pharmacy staff can view dispensing history");
    }

    public long lowStockCount() {
        return medicineRepository.countLowStock();
    }

    @Transactional
    public StockBatch adjustStock(AuthUser actor, Long batchId, int quantity, String reason) {
        var initial = batchRepository.findById(batchId).orElseThrow(() -> ApiException.notFound("Batch"));
        Medicine medicine = medicineRepository.lockById(initial.getMedicine().getId()).orElseThrow(() -> ApiException.notFound("Medicine"));
        // Refresh after obtaining the shared medicine lock so concurrent receipts/dispenses cannot overwrite counts.
        entityManager.refresh(initial);
        int previous = initial.getQuantity();
        if (quantity < 0 || quantity > previous) throw ApiException.badRequest("INVALID_ADJUSTMENT", "Write-offs must reduce stock; receive new stock using a new batch");
        if (reason == null || reason.isBlank()) throw ApiException.badRequest("REASON_REQUIRED", "Enter the reason for this stock write-off");
        initial.setQuantity(quantity);
        medicine.setStockQuantity(medicine.getStockQuantity() - (previous - quantity));
        movementRepository.save(new StockMovement(medicine, StockMovementType.ADJUSTMENT, quantity - previous, reason.trim(), "BATCH-" + batchId, actor.name()));
        medicineRepository.save(medicine);
        return batchRepository.save(initial);
    }

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
}
