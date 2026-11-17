package com.meridian.hms.audit;

import com.meridian.hms.domain.AuditLog;
import com.meridian.hms.domain.BaseEntity;
import com.meridian.hms.repository.AuditLogRepository;
import com.meridian.hms.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

/**
 * Writes an audit row after every successful @Audited action. Auditing never
 * breaks the business call: failures are logged and swallowed.
 */
@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);
    private final AuditLogRepository auditLogRepository;

    public AuditAspect(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Around("@annotation(audited)")
    public Object record(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
        Object result = joinPoint.proceed();
        try {
            AuthUser user = currentUser();
            String entityId = extractId(result);
            AuditLog entry = new AuditLog(
                    user == null ? "system" : user.name(),
                    user == null ? "SYSTEM" : user.role().name(),
                    audited.action(),
                    audited.entity(),
                    entityId,
                    joinPoint.getSignature().getName(),
                    clientIp());
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Audit write failed for {}: {}", audited.action(), ex.getMessage());
        }
        return result;
    }

    private AuthUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser u ? u : null;
    }

    private String extractId(Object result) {
        Object body = result instanceof ResponseEntity<?> entity ? entity.getBody() : result;
        if (body instanceof BaseEntity entity) {
            return String.valueOf(entity.getId());
        }
        if (body instanceof Map<?, ?> map) {
            Object data = map.get("appointment");
            if (data instanceof BaseEntity entity) {
                return String.valueOf(entity.getId());
            }
            Object dispense = map.get("dispense");
            if (dispense instanceof BaseEntity entity) {
                return String.valueOf(entity.getId());
            }
        }
        return null;
    }

    private String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            return forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
        }
        return null;
    }
}
