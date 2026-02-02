package com.smartims.service;

public interface AuditLogService {

    void log(
            String action,
            String entityType,
            Long entityId,
            String description
    );

    void logSystem(String action, String details);

    void log(String action, String details);
}
