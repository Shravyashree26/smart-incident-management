package com.smartims.service.impl;

import com.smartims.entity.AuditLog;
import com.smartims.repository.AuditLogRepository;
import com.smartims.repository.UserRepository;
import com.smartims.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Override
    public void log(String action, String entityType, Long entityId, String description) {

    }

    @Override
    public void logSystem(String action, String details) {

        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .description(details)
                .actorRole("SYSTEM")
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
    }


    @Override
    public void log(String action, String details) {

        Authentication auth = SecurityContextHolder
                .getContext()
                .getAuthentication();

        String performedBy;

        if (auth == null || !auth.isAuthenticated()) {
            performedBy = "SYSTEM"; // 👈 IMPORTANT
        } else {
            performedBy = auth.getName();
        }

        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .description(details)
                .actorRole(performedBy)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
    }

}
