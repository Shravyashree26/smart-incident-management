package com.smartims.service.impl;

import com.smartims.dto.CreateIssueRequest;
import com.smartims.dto.IssueResponse;
import com.smartims.dto.SlaComplianceResponse;
import com.smartims.dto.SlaStatusResponse;
import com.smartims.entity.*;
import com.smartims.enums.IssueStatus;
import com.smartims.enums.Severity;
import com.smartims.exception.ResourceNotFoundException;
import com.smartims.exception.UnauthorizedException;
import com.smartims.mapper.IssueMapper;
import com.smartims.repository.*;
import com.smartims.service.AuditLogService;
import com.smartims.service.IssueActivityService;
import com.smartims.service.IssueService;
import com.smartims.service.NotificationInboxService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IssueServiceImpl implements IssueService {

    private final IssueRepository issueRepository;
    private final SlaBreachRepository slaBreachRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final NotificationInboxService notificationInboxService;
    private final AuditLogService auditLogService;
//    private final SlaPolicy slaPolicy;
    private final SlaPolicyRepository slaPolicyRepository;
    private final IssueActivityService issueActivityService;

    @Override
    public long countByStatus(IssueStatus status) {
        return 0;
    }

    @Override
    public void createIssue(CreateIssueRequest request, String createdBy) {

        User currentUser = userRepository.findByEmail(createdBy)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        //Access check
        if (!currentUser.getRole().name().equals("ADMIN")
                && !project.getManager().equals(currentUser)
                && !project.getMembers().contains(currentUser)) {
            throw new RuntimeException("You are not allowed to create issue for this project");
        }

        //BUSINESS RULE
        String severity;
        String priorityLevel;

        if (project.getManager().equals(currentUser)) {
            severity = String.valueOf(request.getSeverity());
            priorityLevel = request.getPriorityLevel();
        } else {
            severity = "MEDIUM";        // default severity
            priorityLevel = "P3";       // default priority
        }

        Issue issue = Issue.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(Severity.valueOf(severity))
                .priorityLevel(priorityLevel)
                .status(IssueStatus.OPEN)
                .createdBy(createdBy)
                .project(project)
                .createdAt(LocalDateTime.now())
                .slaBreached(false)
                .build();

        SlaPolicy slaPolicy = slaPolicyRepository
                .findByPriorityLevel(issue.getPriorityLevel())
                .orElseThrow(() -> new RuntimeException("SLA policy not found"));

        issue.setSlaStartTime(LocalDateTime.now());
        issue.setSlaDueTime(
                LocalDateTime.now().plusMinutes(
                        slaPolicy.getResolutionTimeMinutes()
                )
        );


        issueRepository.save(issue);

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_CREATED",
                "New issue created: " + issue.getTitle(),
                issue
        );

        issueActivityService.logActivity(
                issue,
                "CREATED",
                "Issue created"
        );

        auditLogService.log(
                "CREATE_ISSUE",
                "ISSUE",
                issue.getId(),
                "Issue created for project " + project.getName()
        );
    }


    @Override
    public List<Issue> getIssuesByProject(Long projectId) {

        User currentUser = userRepository.findByEmail(
                SecurityContextHolder.getContext().getAuthentication().getName()
        ).orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (currentUser.getRole().name().equals("ADMIN")) {
            return issueRepository.findByProject(project);
        }

        if (currentUser.getRole().name().equals("MANAGER")
                && project.getManager().equals(currentUser)) {
            return issueRepository.findByProject(project);
        }

        if (currentUser.getRole().name().equals("ENGINEER")) {
            return issueRepository.findByProjectAndAssignedEngineer(project, currentUser);
        }

        if (project.getMembers().contains(currentUser)) {
            return issueRepository.findByProject(project);
        }

        throw new RuntimeException("Access denied for this project");
    }


    @Override
    public void updateIssueStatus(
            Long issueId,
            IssueStatus newStatus,
            String role
    ) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        IssueStatus currentStatus = issue.getStatus();

        switch (role) {
            case "ROLE_ENGINEER" -> {
                if (currentStatus == IssueStatus.OPEN &&
                        newStatus == IssueStatus.IN_PROGRESS ||
                        currentStatus == IssueStatus.IN_PROGRESS &&
                                newStatus == IssueStatus.RESOLVED) {

                    issue.setStatus(newStatus);
                } else {
                    throw new UnauthorizedException("Invalid status transition for ENGINEER");
                }
            }

            case "ROLE_MANAGER" -> {
                if (currentStatus == IssueStatus.RESOLVED &&
                        newStatus == IssueStatus.CLOSED) {

                    issue.setStatus(newStatus);
                } else {
                    throw new UnauthorizedException("MANAGER can only close issues");
                }
            }

            case "ROLE_ADMIN" -> {
                issue.setStatus(newStatus);
            }

            default -> throw new UnauthorizedException("Role not allowed to update issue status");
        }

        issueActivityService.logActivity(
                issue,
                "STATUS_CHANGE",
                "Status changed to " + currentStatus
        );

        issueRepository.save(issue);

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_STATUS_UPDATED",
                "Issue '" + issue.getTitle() + "' status changed to " + newStatus,
                issue
        );




        auditLogService.log(
                "UPDATE_ISSUE_STATUS",
                "ISSUE",
                issue.getId(),
                "Status updated to " + newStatus
        );

    }

    @Override
    public IssueResponse getIssueById(Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Issue not found with id: " + id)
                );

        return IssueMapper.toResponse(issue);
    }

    @Override
    public List<IssueResponse> getAllIssues() {
        return issueRepository.findAll()
                .stream()
                .map(IssueMapper::toResponse)
                .toList();
    }

    @Override
    public void assignEngineer(Long issueId, Long engineerId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        User engineer = userRepository.findById(engineerId)
                .orElseThrow(() -> new RuntimeException("Engineer not found"));

        // Role check
        if (!engineer.getRole().name().equals("ENGINEER")) {
            throw new RuntimeException("User is not an engineer");
        }

        // Project membership check
        if (!issue.getProject().getMembers().contains(engineer)) {
            throw new RuntimeException("Engineer is not part of this project");
        }

        issue.setAssignedEngineer(engineer);
        issueRepository.save(issue);

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_ASSIGNED",
                "Issue '" + issue.getTitle() + "' assigned to engineer " + engineer.getEmail(),
                issue
        );

        issueActivityService.logActivity(
                issue,
                "ASSIGNED",
                "Assigned to " + engineer.getFullName()
        );

        auditLogService.log(
                "ASSIGN_ENGINEER",
                "ISSUE",
                issue.getId(),
                "Assigned to engineer " + engineer.getEmail()
        );
    }

    @Override
    @Transactional
    public IssueResponse assignIssue(Long issueId, Long engineerId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() ->
                        new RuntimeException("Issue not found with id: " + issueId)
                );

        User engineer = userRepository.findById(engineerId)
                .orElseThrow(() ->
                        new RuntimeException("Engineer not found with id: " + engineerId)
                );

        issue.setAssignedEngineer(engineer);

        return IssueMapper.toResponse(issueRepository.save(issue));
    }

    @Override
    public List<IssueResponse> getIssuesByEngineer(Long engineerId) {

        return issueRepository.findByAssignedEngineerId(engineerId)
                .stream()
                .map(IssueMapper::toResponse)
                .toList();
    }


    private void recordSlaBreachIfNeeded(
            Issue issue,
            LocalDateTime dueTime,
            LocalDateTime breachedAt) {

        if (slaBreachRepository.existsByIssue(issue)) {
            return; // already recorded
        }

        long delayMinutes =
                Duration.between(dueTime, breachedAt).toMinutes();

        SlaBreach breach = new SlaBreach();
        breach.setIssue(issue);
        breach.setBreachedAt(breachedAt);
        breach.setSlaDueTime(dueTime);
        breach.setDelayMinutes(delayMinutes);

        slaBreachRepository.save(breach);

        issue.setSlaBreached(true);
        issueRepository.save(issue);
    }



    @Override
    public void autoAssignEngineer(Long issueId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        Project project = issue.getProject();

        // Get engineers in this project
        List<User> engineers = project.getMembers()
                .stream()
                .filter(user -> user.getRole().name().equals("ENGINEER"))
                .toList();

        if (engineers.isEmpty()) {
            throw new RuntimeException("No engineers available in project");
        }

        // Select engineer with least OPEN issues
        User selectedEngineer = engineers.stream()
                .min(Comparator.comparingLong(
                        engineer ->
                                issueRepository.countByAssignedEngineerAndStatus(
                                        engineer, IssueStatus.OPEN
                                )
                ))
                .orElseThrow();

        issue.setAssignedEngineer(selectedEngineer);
        issueRepository.save(issue);

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_AUTO_ASSIGNED",
                "Issue '" + issue.getTitle() + "' auto-assigned to engineer "
                        + selectedEngineer.getEmail(),
                issue
        );

        issueActivityService.logActivity(
                issue,
                "AUTO_ASSIGNED",
                "Auto-assigned to " + selectedEngineer.getFullName()
        );

        auditLogService.log(
                "AUTO_ASSIGN_ENGINEER",
                "ISSUE",
                issue.getId(),
                "Auto-assigned to engineer " + selectedEngineer.getEmail()
        );
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

            recordSlaBreachIfNeeded(issue, due, now);
        } else if (remainingMinutes <= totalMinutes * 0.2) {
            status = "AT_RISK";
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

    @Override
    public SlaComplianceResponse getSlaComplianceSummary() {

        long totalIssues = issueRepository.count();
        long breached = issueRepository.countBySlaBreachedTrue();
        long met = totalIssues - breached;

        double compliance = totalIssues == 0
                ? 100.0
                : ((double) met / totalIssues) * 100;

        return SlaComplianceResponse.builder()
                .totalIssues(totalIssues)
                .slaBreached(breached)
                .slaMet(met)
                .compliancePercentage(
                        Math.round(compliance * 100.0) / 100.0
                )
                .build();
    }


}
