package com.meridian.hms.service;

import com.meridian.hms.domain.AuditLog;
import com.meridian.hms.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public List<AuditLog> list(String action, String entityType, String actor, int limit) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(a -> action == null || action.isBlank() || a.getAction().equalsIgnoreCase(action))
                .filter(a -> entityType == null || entityType.isBlank()
                        || (a.getEntityType() != null && a.getEntityType().equalsIgnoreCase(entityType)))
                .filter(a -> actor == null || actor.isBlank()
                        || (a.getActorName() != null && a.getActorName().toLowerCase(Locale.ROOT)
                        .contains(actor.toLowerCase(Locale.ROOT))))
                .limit(limit <= 0 ? 200 : Math.min(limit, 1000))
                .toList();
    }

    public List<AuditLog> recent(int limit) {
        return list(null, null, null, limit);
    }
}
