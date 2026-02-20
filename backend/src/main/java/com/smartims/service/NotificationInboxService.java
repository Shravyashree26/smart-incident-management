package com.smartims.service;

import com.smartims.entity.Issue;
import com.smartims.entity.Project;
import com.smartims.entity.User;

import java.util.List;

public interface NotificationInboxService {

    void notifyForIssueEvent(
            String type,
            String message,
            Issue issue
    );

    void notifyForProjectEvent(
            String type,
            String message,
            Project project
    );

    void notifyUsers(
            String type,
            String message,
            String entityType,
            Long entityId,
            List<User> recipients
    );
}

