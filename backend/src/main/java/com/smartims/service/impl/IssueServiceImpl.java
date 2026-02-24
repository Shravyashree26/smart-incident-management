package com.smartims.service.impl;

import com.smartims.dto.CreateIssueRequest;
import com.smartims.dto.IssueResponse;
import com.smartims.dto.ManagerAssignmentBoardResponse;
import com.smartims.dto.ManagerEngineerAssignmentResponse;
import com.smartims.dto.SlaComplianceResponse;
import com.smartims.dto.SlaStatusResponse;
import com.smartims.repository.SlaBreachRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IssueServiceImpl implements IssueService {

    private final IssueRepository issueRepository;
    private final SlaBreachRepository slaBreachRepository;
    private final ProjectRepository projectRepository;
    private final SlaPolicyRepository slaPolicyRepository;
    private final UserRepository userRepository;
    private final NotificationInboxService notificationInboxService;
    private final AuditLogService auditLogService;
    private final IssueActivityService issueActivityService;

    @Override
    public long countByStatus(IssueStatus status) {
        return issueRepository.countByStatus(status);
    }

    @Override
    public IssueResponse createIssue(CreateIssueRequest request, String createdBy) {

        User currentUser = userRepository.findByEmail(createdBy)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!currentUser.getRole().name().equals("ADMIN")
                && !project.getManager().equals(currentUser)
                && !project.getMembers().contains(currentUser)) {
            throw new RuntimeException("You are not allowed to create issue for this project");
        }

        Severity severity;
        String priorityLevel;

        if (project.getManager().equals(currentUser)) {
            severity = request.getSeverity() != null ? request.getSeverity() : Severity.MEDIUM;
            priorityLevel = request.getPriorityLevel() != null ? request.getPriorityLevel() : "-";
        } else {
            // Keep DB-compatible severity value; frontend/API will show "-" while priority is unassigned.
            severity = Severity.MEDIUM;
            priorityLevel = "-";
        }

        Issue issue = Issue.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(severity)
                .priorityLevel(priorityLevel)
                .status(IssueStatus.OPEN)
                .triaged(project.getManager().equals(currentUser) || currentUser.getRole().name().equals("ADMIN"))
                .createdBy(createdBy)
                .project(project)
                .createdAt(LocalDateTime.now())
                .slaBreached(false)
                .build();

        // SLA timer will be initialized when engineer starts work (OPEN -> IN_PROGRESS).
        issue.setSlaStartTime(null);
        issue.setSlaDueTime(null);

        Issue savedIssue = issueRepository.save(issue);

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_CREATED",
                "New issue created: " + savedIssue.getTitle(),
                savedIssue
        );

        issueActivityService.logActivity(
                savedIssue,
                "CREATED",
                "Issue created"
        );

        auditLogService.log(
                "ISSUE_CREATED",
                "ISSUE",
                savedIssue.getId(),
                "Issue created for project " + project.getName()
        );

        return toIssueResponse(savedIssue);
    }

    @Override
    public List<Issue> getIssuesByProject(Long projectId) {

        User currentUser = userRepository.findByEmail(
                SecurityContextHolder.getContext().getAuthentication().getName()
        ).orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (currentUser.getRole().name().equals("ADMIN")
                || (currentUser.getRole().name().equals("MANAGER")
                && project.getManager().equals(currentUser))
                || project.getMembers().contains(currentUser)) {

            if (currentUser.getRole().name().equals("ENGINEER")) {
                return issueRepository.findByProjectAndAssignedEngineer(project, currentUser);
            }

            return issueRepository.findByProject(project);
        }

        throw new RuntimeException("Access denied for this project");
    }

    @Override
    public void updateIssueStatus(Long issueId, IssueStatus newStatus, String role) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        // Check access permissions
        validateIssueAccess(issue);

        IssueStatus oldStatus = issue.getStatus();

        switch (role) {
            case "ROLE_ENGINEER" -> {
                if ((oldStatus == IssueStatus.OPEN && newStatus == IssueStatus.IN_PROGRESS)
                        || (oldStatus == IssueStatus.IN_PROGRESS && newStatus == IssueStatus.RESOLVED)) {
                    if (oldStatus == IssueStatus.OPEN && newStatus == IssueStatus.IN_PROGRESS) {
                        initializeSlaWindow(issue);
                        issue.setResolvedAt(null);
                    }
                    if (oldStatus == IssueStatus.IN_PROGRESS && newStatus == IssueStatus.RESOLVED) {
                        issue.setResolvedAt(LocalDateTime.now());
                    }
                    issue.setStatus(newStatus);
                } else {
                    throw new UnauthorizedException("Invalid status transition for ENGINEER");
                }
            }
            case "ROLE_MANAGER" -> {
                if (oldStatus == IssueStatus.RESOLVED
                        && (newStatus == IssueStatus.CLOSED || newStatus == IssueStatus.OPEN)) {
                    if (newStatus == IssueStatus.OPEN) {
                        // Reopened by manager; next engineer start should initialize a fresh SLA window.
                        issue.setResolvedAt(null);
                        issue.setSlaStartTime(null);
                        issue.setSlaDueTime(null);
                        issue.setEscalated(false);
                    }
                    issue.setStatus(newStatus);
                } else {
                    throw new UnauthorizedException("MANAGER can only move RESOLVED issues to CLOSED or OPEN");
                }
            }
            case "ROLE_ADMIN" -> issue.setStatus(newStatus);
            default -> throw new UnauthorizedException("Role not allowed to update issue status");
        }

        issueRepository.save(issue);

        issueActivityService.logActivity(
                issue,
                "STATUS_UPDATED",
                "Status changed from " + oldStatus + " to " + newStatus
        );

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_STATUS_UPDATED",
                "Issue '" + issue.getTitle() + "' status changed from "
                        + oldStatus + " to " + newStatus,
                issue
        );

        auditLogService.log(
                "ISSUE_STATUS_UPDATED",
                "ISSUE",
                issue.getId(),
                "Status updated from " + oldStatus + " to " + newStatus
        );
    }

    @Override
    public IssueResponse getIssueById(Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found with id: " + id));
        
        // Check access permissions
        validateIssueAccess(issue);
        
        return toIssueResponse(issue);
    }

    @Override
    public List<IssueResponse> getAllIssues() {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;

        // If no authentication, return all issues (shouldn't happen in practice)
        if (email == null) {
            return issueRepository.findAll()
                    .stream()
                    .map(this::toIssueResponse)
                    .toList();
        }

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Issue> issues;

        // SUPER_ADMIN can see all issues
        if (currentUser.getRole().name().equals("SUPER_ADMIN")) {
            issues = issueRepository.findAll();
        }
        // ADMIN can see all issues
        else if (currentUser.getRole().name().equals("ADMIN")) {
            issues = issueRepository.findAll();
        }
        // MANAGER can see only issues in their projects
        else if (currentUser.getRole().name().equals("MANAGER")) {
            List<Project> managerProjects = projectRepository.findByManager(currentUser);
            issues = managerProjects.stream()
                    .flatMap(project -> issueRepository.findByProject(project).stream())
                    .toList();
        }
        // ENGINEER can see only issues assigned to them
        else if (currentUser.getRole().name().equals("ENGINEER")) {
            issues = issueRepository.findByAssignedEngineer(currentUser);
        }
        // USER can see issues created by them
        else if (currentUser.getRole().name().equals("USER")) {
            issues = issueRepository.findByCreatedBy(currentUser.getEmail());
        } else {
            issues = List.of();
        }

        return issues.stream()
                .map(this::toIssueResponse)
                .toList();
    }

    @Override
    public IssueResponse updateIssueDetails(Long issueId, String title, String description, Severity severity) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        validateIssueAccess(issue);

        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        String role = currentUser.getRole().name();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new UnauthorizedException("Only manager/admin can edit issue details");
        }

        String oldTitle = issue.getTitle();
        String oldDescription = issue.getDescription();
        Severity oldSeverity = issue.getSeverity();

        issue.setTitle(title);
        issue.setDescription(description);
        issue.setSeverity(severity);
        issue.setPriorityLevel(severity.name());
        issue.setTriaged(true);
        Issue saved = issueRepository.save(issue);

        issueActivityService.logActivity(
                saved,
                "ISSUE_UPDATED",
                "Issue details updated (title/description/severity)"
        );

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_UPDATED",
                "Issue '" + oldTitle + "' updated by manager",
                saved
        );

        auditLogService.log(
                "ISSUE_UPDATED",
                "ISSUE",
                saved.getId(),
                "Updated title from '" + oldTitle + "', description length from "
                        + (oldDescription != null ? oldDescription.length() : 0)
                        + ", severity from " + oldSeverity + " to " + severity
        );

        return toIssueResponse(saved);
    }

    @Override
    public IssueResponse updateIssueSeverity(Long issueId, Severity severity) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        validateIssueAccess(issue);

        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        String role = currentUser.getRole().name();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new UnauthorizedException("Only manager/admin can update issue severity");
        }

        Severity oldSeverity = issue.getSeverity();
        issue.setSeverity(severity);
        issue.setPriorityLevel(severity.name());
        issue.setTriaged(true);
        Issue saved = issueRepository.save(issue);

        issueActivityService.logActivity(
                saved,
                "SEVERITY_UPDATED",
                "Severity changed from " + oldSeverity + " to " + severity
        );

        notificationInboxService.notifyForIssueEvent(
                "ISSUE_SEVERITY_UPDATED",
                "Issue '" + saved.getTitle() + "' severity changed from " + oldSeverity + " to " + severity,
                saved
        );

        auditLogService.log(
                "ISSUE_SEVERITY_UPDATED",
                "ISSUE",
                saved.getId(),
                "Severity changed from " + oldSeverity + " to " + severity
        );

        return toIssueResponse(saved);
    }

    @Override
    public void assignEngineer(Long issueId, Long engineerId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        // Check access permissions
        validateIssueAccess(issue);

        User engineer = userRepository.findById(engineerId)
                .orElseThrow(() -> new RuntimeException("Engineer not found"));

        if (!engineer.getRole().name().equals("ENGINEER")) {
            throw new RuntimeException("User is not an engineer");
        }

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
                "ENGINEER_ASSIGNED",
                "ISSUE",
                issue.getId(),
                "Assigned to engineer " + engineer.getEmail()
        );
    }

    @Override
    @Transactional
    public IssueResponse assignIssue(Long issueId, Long engineerId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        // Check access permissions
        validateIssueAccess(issue);

        User engineer = userRepository.findById(engineerId)
                .orElseThrow(() -> new RuntimeException("Engineer not found"));

        if (!"ENGINEER".equals(engineer.getRole().name())) {
            throw new RuntimeException("Selected user is not an engineer");
        }

        if (!issue.getProject().getMembers().contains(engineer)) {
            throw new RuntimeException("Engineer is not part of this issue project");
        }

        issue.setAssignedEngineer(engineer);

        Issue saved = issueRepository.save(issue);

        auditLogService.log(
                "ENGINEER_ASSIGNED",
                "ISSUE",
                saved.getId(),
                "Assigned to engineer " + engineer.getEmail()
        );

        return toIssueResponse(saved);
    }

    @Override
    public List<IssueResponse> getIssuesByEngineer(Long engineerId) {
        return issueRepository.findByAssignedEngineerId(engineerId)
                .stream()
                .map(this::toIssueResponse)
                .toList();
    }

    @Override
    public ManagerAssignmentBoardResponse getManagerAssignmentBoard() {
        User currentUser = getCurrentUser();
        List<Project> managerProjects = projectRepository.findByManager(currentUser);
        List<Issue> managerIssues = managerProjects.stream()
                .flatMap(project -> issueRepository.findByProject(project).stream())
                .toList();

        Set<Long> projectIds = managerProjects.stream()
                .map(Project::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, User> engineerById = managerProjects.stream()
                .flatMap(project -> project.getMembers().stream())
                .filter(member -> member.getRole() != null && "ENGINEER".equals(member.getRole().name()))
                .filter(member -> member.getId() != null)
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        Map<Long, Set<Long>> engineerProjectIds = managerProjects.stream()
                .flatMap(project -> project.getMembers().stream()
                        .filter(member -> member.getRole() != null && "ENGINEER".equals(member.getRole().name()))
                        .filter(member -> member.getId() != null)
                        .map(member -> Map.entry(member.getId(), project.getId())))
                .collect(Collectors.groupingBy(
                        Map.Entry::getKey,
                        Collectors.mapping(Map.Entry::getValue, Collectors.toSet())
                ));

        Map<Long, List<IssueResponse>> issuesByEngineerId = managerIssues.stream()
                .filter(issue -> issue.getAssignedEngineer() != null && issue.getAssignedEngineer().getId() != null)
                .collect(Collectors.groupingBy(
                        issue -> issue.getAssignedEngineer().getId(),
                        Collectors.mapping(this::toIssueResponse, Collectors.toList())
                ));

        List<ManagerEngineerAssignmentResponse> engineerCards = engineerById.values().stream()
                .map(engineer -> ManagerEngineerAssignmentResponse.builder()
                        .engineerId(engineer.getId())
                        .engineerName(engineer.getFullName())
                        .engineerEmail(engineer.getEmail())
                        .projectIds(engineerProjectIds.getOrDefault(engineer.getId(), Set.of()).stream().toList())
                        .assignedIssues(issuesByEngineerId.getOrDefault(engineer.getId(), List.of()))
                        .build())
                .toList();

        List<IssueResponse> unassignedIssues = managerIssues.stream()
                .filter(issue -> issue.getAssignedEngineer() == null)
                .filter(issue -> issue.getProject() != null && projectIds.contains(issue.getProject().getId()))
                .map(this::toIssueResponse)
                .toList();

        return ManagerAssignmentBoardResponse.builder()
                .engineers(engineerCards)
                .unassignedIssues(unassignedIssues)
                .build();
    }

    @Override
    @Transactional
    public ManagerAssignmentBoardResponse autoAssignUnassignedIssuesForManager() {
        User currentUser = getCurrentUser();
        List<Project> managerProjects = projectRepository.findByManager(currentUser);

        for (Project project : managerProjects) {
            List<User> engineers = project.getMembers()
                    .stream()
                    .filter(member -> member.getRole() != null && "ENGINEER".equals(member.getRole().name()))
                    .toList();

            if (engineers.isEmpty()) {
                continue;
            }

            List<Issue> unassigned = issueRepository.findByProject(project)
                    .stream()
                    .filter(issue -> issue.getAssignedEngineer() == null)
                    .sorted(Comparator
                            .comparingInt((Issue issue) -> severityWeight(issue.getSeverity()))
                            .reversed()
                            .thenComparing(Issue::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();

            Map<Long, Long> weightedLoadMap = new HashMap<>();
            Map<Long, Long> activeIssueCountMap = new HashMap<>();
            for (User engineer : engineers) {
                weightedLoadMap.put(engineer.getId(), calculateEngineerWeightedLoad(engineer));
                activeIssueCountMap.put(engineer.getId(), countActiveAssignedIssues(engineer));
            }

            for (Issue issue : unassigned) {
                User selectedEngineer = engineers.stream()
                        .min(Comparator
                                .comparingLong((User engineer) -> weightedLoadMap.getOrDefault(engineer.getId(), 0L))
                                .thenComparingLong(engineer -> activeIssueCountMap.getOrDefault(engineer.getId(), 0L))
                                .thenComparing(User::getId))
                        .orElse(null);

                if (selectedEngineer == null) {
                    continue;
                }

                issue.setAssignedEngineer(selectedEngineer);
                issueRepository.save(issue);
                weightedLoadMap.put(
                        selectedEngineer.getId(),
                        weightedLoadMap.getOrDefault(selectedEngineer.getId(), 0L) + severityWeight(issue.getSeverity())
                );
                activeIssueCountMap.put(
                        selectedEngineer.getId(),
                        activeIssueCountMap.getOrDefault(selectedEngineer.getId(), 0L) + 1L
                );

                issueActivityService.logActivity(
                        issue,
                        "AUTO_ASSIGNED",
                        "Auto-assigned to " + selectedEngineer.getFullName()
                );
            }
        }

        return getManagerAssignmentBoard();
    }

    private void recordSlaBreachIfNeeded(Issue issue, LocalDateTime dueTime, LocalDateTime breachedAt) {

        if (slaBreachRepository.existsByIssue(issue)) {
            return;
        }

        long delayMinutes = Duration.between(dueTime, breachedAt).toMinutes();

        SlaBreach breach = new SlaBreach();
        breach.setIssue(issue);
        breach.setBreachedAt(breachedAt);
        breach.setSlaDueTime(dueTime);
        breach.setDelayMinutes(delayMinutes);

        slaBreachRepository.save(breach);

        issue.setSlaBreached(true);
        issueRepository.save(issue);

        auditLogService.logSystem(
                "SLA_BREACH_RECORDED",
                "SLA breach recorded with delay " + delayMinutes + " minutes",
                issue.getId(),
                "ISSUE"
        );
    }

    @Override
    public void autoAssignEngineer(Long issueId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        // Check access permissions
        validateIssueAccess(issue);

        Project project = issue.getProject();

        List<User> engineers = project.getMembers()
                .stream()
                .filter(u -> u.getRole().name().equals("ENGINEER"))
                .toList();

        if (engineers.isEmpty()) {
            throw new RuntimeException("No engineers available in project");
        }

        Map<Long, Long> weightedLoadMap = new HashMap<>();
        Map<Long, Long> activeIssueCountMap = new HashMap<>();
        for (User engineer : engineers) {
            weightedLoadMap.put(engineer.getId(), calculateEngineerWeightedLoad(engineer));
            activeIssueCountMap.put(engineer.getId(), countActiveAssignedIssues(engineer));
        }

        User selectedEngineer = engineers.stream()
                .min(Comparator
                        .comparingLong((User engineer) -> weightedLoadMap.getOrDefault(engineer.getId(), 0L))
                        .thenComparingLong(engineer -> activeIssueCountMap.getOrDefault(engineer.getId(), 0L))
                        .thenComparing(User::getId))
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

        auditLogService.logSystem(
                "ISSUE_AUTO_ASSIGNED",
                "Auto-assigned to engineer " + selectedEngineer.getEmail(),
                issue.getId(),
                "ISSUE"
        );
    }

    @Override
    public SlaStatusResponse getSlaStatus(Long issueId) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        // Check access permissions
        validateIssueAccess(issue);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = issue.getSlaStartTime();
        LocalDateTime due = issue.getSlaDueTime();
        LocalDateTime resolvedAt = issue.getResolvedAt();

        if (start == null || due == null) {
            return SlaStatusResponse.builder()
                    .slaStartTime(null)
                    .slaDueTime(null)
                    .remainingMinutes(0)
                    .status("NOT_STARTED")
                    .build();
        }

        long totalMinutes = Duration.between(start, due).toMinutes();
        boolean issueCompleted = issue.getStatus() == IssueStatus.RESOLVED || issue.getStatus() == IssueStatus.CLOSED;
        LocalDateTime evaluationTime = issueCompleted && resolvedAt != null ? resolvedAt : now;
        long remainingMinutes = Duration.between(evaluationTime, due).toMinutes();

        String status;

        if (issueCompleted && resolvedAt != null) {
            if (resolvedAt.isAfter(due)) {
                status = "BREACHED";
                remainingMinutes = 0;
                recordSlaBreachIfNeeded(issue, due, resolvedAt);
            } else {
                status = "RESOLVED_IN_SLA";
                remainingMinutes = Math.max(0, remainingMinutes);
            }
        } else if (evaluationTime.isAfter(due)) {
            status = "BREACHED";
            remainingMinutes = 0;
            recordSlaBreachIfNeeded(issue, due, evaluationTime);
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

    private void initializeSlaWindow(Issue issue) {
        LocalDateTime now = LocalDateTime.now();
        long resolutionMinutes = 60L;
        String priority = issue.getPriorityLevel();
        if (priority != null && !priority.isBlank() && !"-".equals(priority)) {
            resolutionMinutes = slaPolicyRepository
                    .findByProjectIdAndPriorityLevel(issue.getProject().getId(), priority)
                    .map(policy -> Long.valueOf(policy.getResolutionTimeMinutes()))
                    .orElse(60L);
        }
        issue.setSlaStartTime(now);
        issue.setSlaDueTime(now.plusMinutes(Math.max(1L, resolutionMinutes)));
        issue.setEscalated(false);
    }

    private User getCurrentUser() {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Authenticated user not found");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    private long calculateEngineerWeightedLoad(User engineer) {
        return issueRepository.findByAssignedEngineer(engineer)
                .stream()
                .filter(this::isIssueActiveForWorkload)
                .mapToLong(issue -> severityWeight(issue.getSeverity()))
                .sum();
    }

    private long countActiveAssignedIssues(User engineer) {
        return issueRepository.findByAssignedEngineer(engineer)
                .stream()
                .filter(this::isIssueActiveForWorkload)
                .count();
    }

    private boolean isIssueActiveForWorkload(Issue issue) {
        return issue != null && issue.getStatus() != IssueStatus.CLOSED;
    }

    private int severityWeight(Severity severity) {
        if (severity == null) return 2;
        return switch (severity) {
            case CRITICAL -> 4;
            case HIGH -> 3;
            case MEDIUM -> 2;
            case LOW -> 1;
        };
    }

    private IssueResponse toIssueResponse(Issue issue) {
        IssueResponse response = IssueMapper.toResponse(issue);
        String createdByEmail = issue.getCreatedBy();
        String createdByName = userRepository.findByEmail(createdByEmail)
                .map(User::getFullName)
                .orElse(createdByEmail);
        response.setCreatedBy(createdByEmail);
        response.setCreatedByName(createdByName);
        return response;
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

    private void validateIssueAccess(Issue issue) {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;

        if (email == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // SUPER_ADMIN can access any issue
        if (currentUser.getRole().name().equals("SUPER_ADMIN")) {
            return;
        }

        // ADMIN can access issues from their company only
        if (currentUser.getRole().name().equals("ADMIN")) {
            String userCompany = currentUser.getCompany();
            String issueProjectManagerCompany = issue.getProject().getManager() != null ? 
                    issue.getProject().getManager().getCompany() : null;

            if (userCompany == null || !userCompany.equals(issueProjectManagerCompany)) {
                throw new UnauthorizedException("Access denied: Issue belongs to a different company");
            }
            return;
        }

        // MANAGER can access issues from their projects only
        if (currentUser.getRole().name().equals("MANAGER")) {
            if (!issue.getProject().getManager().getId().equals(currentUser.getId())) {
                throw new UnauthorizedException("Access denied: Issue is not in your project");
            }
            return;
        }

        // ENGINEER can access issues assigned to them
        if (currentUser.getRole().name().equals("ENGINEER")) {
            if (!currentUser.getId().equals(issue.getAssignedEngineer() != null ?
                    issue.getAssignedEngineer().getId() : null)) {
                throw new UnauthorizedException("Access denied: This issue is not assigned to you");
            }
            return;
        }

        // USER can access issues created by them
        if (currentUser.getRole().name().equals("USER")) {
            if (!email.equalsIgnoreCase(String.valueOf(issue.getCreatedBy()))) {
                throw new UnauthorizedException("Access denied: This issue was not created by you");
            }
            return;
        }

        throw new UnauthorizedException("Access denied");
    }
}
