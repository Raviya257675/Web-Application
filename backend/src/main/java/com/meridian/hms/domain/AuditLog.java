package com.meridian.hms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog extends BaseEntity {

    private String actorName;

    private String actorRole;

    @Column(nullable = false)
    private String action;

    private String entityType;

    private String entityId;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String ipAddress;

    public AuditLog(String actorName, String actorRole, String action, String entityType,
                    String entityId, String details, String ipAddress) {
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.details = details;
        this.ipAddress = ipAddress;
    }
}
