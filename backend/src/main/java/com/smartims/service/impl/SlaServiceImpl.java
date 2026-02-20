package com.smartims.service.impl;

import com.smartims.dto.SlaCreateRequest;
import com.smartims.dto.SlaResponse;
import com.smartims.dto.SlaStatusResponse;
import com.smartims.entity.Issue;
import com.smartims.entity.Project;
import com.smartims.entity.SlaPolicy;
import com.smartims.entity.User;
import com.smartims.enums.IssueStatus;
import com.smartims.enums.Role;
import com.smartims.exception.BadRequestException;
import com.smartims.exception.ResourceNotFoundException;
import com.smartims.mapper.SlaMapper;
import com.smartims.repository.IssueRepository;
import com.smartims.repository.ProjectRepository;
import com.smartims.repository.SlaPolicyRepository;
import com.smartims.repository.UserRepository;
import com.smartims.service.AuditLogService;
import com.smartims.service.NotificationInboxService;
import com.smartims.service.SlaService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class SlaServiceImpl implements SlaService {

    private final SlaPolicyRepository slaPolicyRepository;
    private final IssueRepository issueRepository;
    private final AuditLogService auditLogService;
    private final NotificationInboxService notificationInboxService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Override
    public SlaResponse createSla(SlaCreateRequest request) {

        if (request.getProjectId() == null) {
            throw new BadRequestException("Project ID is required");
        }

        if (request.getResolutionTimeMinutes() == null || request.getResolutionTimeMinutes() <= 0) {
            throw new BadRequestException("Resolution time must be greater than 0 minutes");
        }

        String normalizedPriority = normalizePriority(request.getPriorityLevel());
        if (normalizedPriority.isBlank()) {
            throw new BadRequestException("Priority level is required");
        }

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Project not found with id: " + request.getProjectId())
                );

        validateProjectCompanyAccess(project);

        if (slaPolicyRepository.findByProjectIdAndPriorityLevel(project.getId(), normalizedPriority).isPresent()) {
            throw new BadRequestException(
                    "SLA policy already exists for project '" + project.getName()
                            + "' and priority '" + normalizedPriority + "'"
            );
        }

        SlaPolicy slaPolicy = SlaPolicy.builder()
                .priorityLevel(normalizedPriority)
                .resolutionTimeMinutes(request.getResolutionTimeMinutes())
                .description(request.getDescription())
                .project(project)
                .build();

        SlaPolicy savedPolicy = slaPolicyRepository.save(slaPolicy);

        notificationInboxService.notifyForProjectEvent(
                "SLA_CREATED",
                "SLA policy created for project '" + project.getName()
                        + "' (" + savedPolicy.getPriorityLevel() + ")",
                project
        );

        auditLogService.log(
                "SLA_CREATED",
                "PROJECT",
                project.getId(),
                "SLA policy created for priority "
                        + savedPolicy.getPriorityLevel()
                        + " with resolution time "
                        + savedPolicy.getResolutionTimeMinutes()
                        + " minutes"
        );

        return SlaMapper.toResponse(savedPolicy);

    }

    private String normalizePriority(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    @Override
    public List<SlaResponse> getPoliciesForCurrentUser() {
        User currentUser = getCurrentUser();

        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return slaPolicyRepository.findAll()
                    .stream()
                    .map(SlaMapper::toResponse)
                    .toList();
        }

        String company = currentUser.getCompany();
        if (company == null || company.isBlank()) {
            return List.of();
        }

        return slaPolicyRepository.findByProjectCompany(company)
                .stream()
                .map(SlaMapper::toResponse)
                .toList();
    }


    @Override
    public void applySla(Issue issue) {
        issue.setSlaBreached(false);
    }

    @Override
    public void checkAndMarkBreach(Issue issue) {

        if (issue == null ||
                issue.getCreatedAt() == null ||
                issue.getPriorityLevel() == null ||
                issue.isSlaBreached() ||
                issue.getStatus() == IssueStatus.CLOSED) {
            return;
        }

        slaPolicyRepository
                .findByProjectIdAndPriorityLevel(
                        issue.getProject().getId(),
                        issue.getPriorityLevel()
                )
                .ifPresent(policy -> {

                    long elapsedMinutes = Duration.between(
                            issue.getCreatedAt(),
                            LocalDateTime.now()
                    ).toMinutes();

                    if (elapsedMinutes > policy.getResolutionTimeMinutes()) {

                        issue.setSlaBreached(true);

                        escalateIfNeeded(issue, "BREACHED");

                        notificationInboxService.notifyForIssueEvent(
                                "SLA_BREACHED",
                                "SLA breached for issue: " + issue.getTitle(),
                                issue
                        );

                        auditLogService.logSystem(
                                "SLA_ESCALATED",
                                "Issue " + issue.getId() + " escalated due to SLA breach",
                                issue.getId(),
                                "ISSUE"
                        );

                        auditLogService.log(
                                "SLA_BREACHED",
                                "ISSUE",
                                issue.getId(),
                                "SLA breached for priority "
                                        + issue.getPriorityLevel()
                                        + " in project "
                                        + issue.getProject().getName()
                        );
                    }
                });
    }

    @Override
    public SlaStatusResponse getSlaStatus(Long issueId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = issue.getSlaStartTime();
        LocalDateTime due = issue.getSlaDueTime();

        if (start == null || due == null) {
            throw new RuntimeException("SLA not initialized for this issue");
        }

        long totalMinutes = Duration.between(start, due).toMinutes();
        long remainingMinutes = Duration.between(now, due).toMinutes();

        String status;

        if (now.isAfter(due)) {
            status = "BREACHED";
            remainingMinutes = 0;

            escalateIfNeeded(issue, status);
        } else if (remainingMinutes <= totalMinutes * 0.2) {
            status = "AT_RISK";

            escalateIfNeeded(issue, status);
        } else {
            status = "ON_TRACK";
        }

        return SlaStatusResponse.builder()
                .slaStartTime(start)
                .slaDueTime(due)
                .remainingMinutes(remainingMinutes)
                .status(status)
                .build();
    }

    private void escalateIfNeeded(Issue issue, String slaStatus) {

        if (Boolean.TRUE.equals(issue.getEscalated())) {
            return;
        }

        issue.setEscalated(true);
        issueRepository.save(issue);

        auditLogService.logSystem(
                "ISSUE_ESCALATION_TRIGGERED",
                "Automatic escalation triggered due to SLA status: " + slaStatus,
                issue.getId(),
                "ISSUE"
        );


        notificationInboxService.notifyForIssueEvent(
                "ISSUE_ESCALATED",
                "Issue '" + issue.getTitle()
                        + "' escalated due to SLA status: " + slaStatus,
                issue
        );

        auditLogService.log(
                "AUTO_ESCALATION",
                "ISSUE",
                issue.getId(),
                "Issue auto-escalated due to SLA status: " + slaStatus
        );
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
        String projectCompany = project.getCompany();

        if (userCompany == null || projectCompany == null || !userCompany.equals(projectCompany)) {
            throw new BadRequestException("Access denied: Project belongs to a different company");
        }
    }

}
