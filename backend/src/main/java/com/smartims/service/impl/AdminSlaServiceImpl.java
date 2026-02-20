package com.smartims.service.impl;

import com.smartims.dto.UpdateSlaPolicyRequest;
import com.smartims.entity.Project;
import com.smartims.entity.SlaPolicy;
import com.smartims.entity.User;
import com.smartims.enums.Role;
import com.smartims.exception.BadRequestException;
import com.smartims.exception.ResourceNotFoundException;
import com.smartims.repository.SlaPolicyRepository;
import com.smartims.repository.UserRepository;
import com.smartims.service.AdminSlaService;
import com.smartims.service.AuditLogService;
import com.smartims.service.NotificationInboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminSlaServiceImpl extends AdminSlaService {

    private final SlaPolicyRepository slaPolicyRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final NotificationInboxService notificationInboxService;

    @Override
    public SlaPolicy updatePolicy(
            Long projectId,
            String priorityLevel,
            UpdateSlaPolicyRequest request) {

        if (request.getResolutionTimeMinutes() == null || request.getResolutionTimeMinutes() <= 0) {
            throw new BadRequestException("Resolution time must be greater than 0 minutes");
        }

        String normalizedPriority = normalizePriority(priorityLevel);

        SlaPolicy policy = slaPolicyRepository
                .findByProjectIdAndPriorityLevel(projectId, normalizedPriority)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "SLA policy not found for priority " + normalizedPriority)
                );

        validateProjectCompanyAccess(policy.getProject());

        Integer oldResolutionTime = policy.getResolutionTimeMinutes();
        policy.setResolutionTimeMinutes(
                toMinutes(request.getResolutionTimeMinutes())
        );
        policy.setDescription(request.getDescription());

        SlaPolicy updatedPolicy = slaPolicyRepository.save(policy);

        notificationInboxService.notifyForProjectEvent(
                "SLA_POLICY_UPDATED",
                "SLA policy updated for project '" + policy.getProject().getName()
                        + "' (" + normalizedPriority + ")",
                policy.getProject()
        );

        auditLogService.log(
                "SLA_POLICY_UPDATED",
                "SLA_POLICY",
                updatedPolicy.getId(),
                "SLA resolution time updated from "
                        + oldResolutionTime
                        + " to "
                        + updatedPolicy.getResolutionTimeMinutes()
                        + " minutes for priority "
                        + normalizedPriority
        );

        return updatedPolicy;
    }

    @Override
    public void deletePolicy(Long projectId, String priorityLevel) {
        String normalizedPriority = normalizePriority(priorityLevel);

        SlaPolicy policy = slaPolicyRepository
                .findByProjectIdAndPriorityLevel(projectId, normalizedPriority)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "SLA policy not found for priority " + normalizedPriority)
                );

        validateProjectCompanyAccess(policy.getProject());

        Long policyId = policy.getId();
        Integer oldResolution = policy.getResolutionTimeMinutes();

        notificationInboxService.notifyForProjectEvent(
                "SLA_POLICY_DELETED",
                "SLA policy deleted for project '" + policy.getProject().getName()
                        + "' (" + normalizedPriority + ")",
                policy.getProject()
        );

        slaPolicyRepository.delete(policy);

        auditLogService.log(
                "SLA_POLICY_DELETED",
                "SLA_POLICY",
                policyId,
                "SLA policy deleted for priority " + normalizedPriority
                        + " with resolution time " + oldResolution + " minutes"
        );
    }

    private Integer toMinutes(Long minutes) {
        if (minutes > Integer.MAX_VALUE) {
            throw new BadRequestException(
                    "Resolution time is too large"
            );
        }
        return minutes.intValue();
    }

    private String normalizePriority(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResourceNotFoundException("User not authenticated");
        }

        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void validateProjectCompanyAccess(Project project) {
        User currentUser = getCurrentUser();

        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        String userCompany = currentUser.getCompany();
        String projectCompany = project == null ? null : project.getCompany();

        if (userCompany == null || projectCompany == null || !userCompany.equals(projectCompany)) {
            throw new BadRequestException("Access denied: Project belongs to a different company");
        }
    }
}
