package com.smartims.service.impl;

import com.smartims.entity.*;
import com.smartims.enums.Role;
import com.smartims.repository.NotificationRepository;
import com.smartims.repository.UserNotificationRepository;
import com.smartims.repository.UserRepository;
import com.smartims.service.NotificationInboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationInboxServiceImpl
        implements NotificationInboxService {

    private final NotificationRepository notificationRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final UserRepository userRepository;

    @Override
    public void notifyForIssueEvent(
            String type,
            String message,
            Issue issue) {

        // 2️⃣ Determine recipients
        List<User> recipients = new ArrayList<>();

        // ADMIN → all admins
        recipients.addAll(
                userRepository.findByRole(Role.ADMIN)
        );

        // MANAGER → project manager
        recipients.add(issue.getProject().getManager());

        // ENGINEERS + USERS → project members
        recipients.addAll(issue.getProject().getMembers());

        // 3️⃣ Remove duplicates
        recipients = recipients.stream()
                .distinct()
                .toList();

        notifyUsers(type, message, "ISSUE", issue.getId(), recipients);
    }

    @Override
    public void notifyForProjectEvent(
            String type,
            String message,
            Project project) {

        List<User> recipients = new ArrayList<>();

        // ADMIN → all admins
        recipients.addAll(userRepository.findByRole(Role.ADMIN));

        // MANAGER → project manager
        if (project.getManager() != null) {
            recipients.add(project.getManager());
        }

        // PROJECT MEMBERS
        recipients.addAll(project.getMembers());

        recipients = recipients.stream().distinct().toList();

        notifyUsers(type, message, "PROJECT", project.getId(), recipients);
    }

    @Override
    public void notifyUsers(
            String type,
            String message,
            String entityType,
            Long entityId,
            List<User> recipients
    ) {
        if (recipients == null || recipients.isEmpty()) {
            return;
        }

        Notification notification = Notification.builder()
                .type(type)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        Map<Long, User> unique = new LinkedHashMap<>();
        for (User user : recipients) {
            if (user == null || user.getId() == null) continue;
            unique.put(user.getId(), user);
        }

        for (User user : unique.values()) {
            userNotificationRepository.save(
                    UserNotification.builder()
                            .user(user)
                            .notification(notification)
                            .read(false)
                            .receivedAt(LocalDateTime.now())
                            .build()
            );
        }
    }
}
