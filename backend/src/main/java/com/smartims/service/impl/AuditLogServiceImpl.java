package com.smartims.service.impl;

import com.smartims.entity.AuditLog;
import com.smartims.repository.AuditLogRepository;
import com.smartims.repository.UserRepository;
import com.smartims.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    public static final String SYSTEM_EMAIL = "system@smartims.local";
    public static final String SYSTEM_ROLE  = "SYSTEM";

    private static final String ENTITY_AUDIT = "AUDIT";

    @Override
    public void log(String action, String entityType, Long entityId, String description) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorEmail = resolveActorEmail(auth);
        String actorRole = resolveActorRole(auth, actorEmail);

        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .actorEmail(actorEmail)
                .actorRole(actorRole)
                .description(description)
                .entityId(entityId)
                .entityType(entityType)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);

        log.info("AUDIT | action={} | entityType={} | entityId={} | desc={}",
                action, entityType, entityId, description);

    }

    @Override
    public void logSystem(String action, String details,
                          Long entityId,
                          String entityType) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorEmail = resolveActorEmail(auth);
        String actorRole = resolveActorRole(auth, actorEmail);

        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .actorEmail(actorEmail)
                .actorRole(actorRole)
                .description(details)
                .entityId(entityId)
                .entityType(entityType)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);

        log.warn("SYSTEM_AUDIT | action={} | entityType={} | entityId={} | details={}",
                action, entityType, entityId, details);
    }


    @Override
    public void log(String action, String details) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorEmail = resolveActorEmail(auth);
        String actorRole = resolveActorRole(auth, actorEmail);

        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .description(details)
                .actorEmail(actorEmail)
                .actorRole(actorRole)
                .entityType(ENTITY_AUDIT)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);

        log.info("AUDIT | action={} | details={}", action, details);
    }

    private String resolveActorEmail(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return SYSTEM_EMAIL;
        }
        String name = auth.getName();
        if (name == null || name.isBlank() || "anonymousUser".equalsIgnoreCase(name)) {
            return SYSTEM_EMAIL;
        }
        return name;
    }

    private String resolveActorRole(Authentication auth, String actorEmail) {
        if (SYSTEM_EMAIL.equals(actorEmail)) {
            return SYSTEM_ROLE;
        }

        var user = userRepository.findByEmail(actorEmail).orElse(null);
        if (user != null && user.getRole() != null) {
            return user.getRole().name();
        }

        if (auth != null && auth.getAuthorities() != null) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                String authority = ga != null ? ga.getAuthority() : null;
                if (authority == null || authority.isBlank()) continue;
                return authority.startsWith("ROLE_")
                        ? authority.substring(5)
                        : authority;
            }
        }
        return SYSTEM_ROLE;
    }

}
