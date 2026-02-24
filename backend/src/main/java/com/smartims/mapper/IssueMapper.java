package com.smartims.mapper;

import com.smartims.dto.IssueResponse;
import com.smartims.entity.Issue;
import com.smartims.enums.IssueStatus;

public class IssueMapper {

    public static IssueResponse toResponse(Issue issue) {
        String status = issue.getStatus().name();
        // Workflow:
        // CREATED -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
        // DB keeps OPEN for compatibility; expose CREATED until manager triages the issue.
        boolean triaged = issue.getTriaged() != null
                ? issue.getTriaged()
                : !"-".equals(String.valueOf(issue.getPriorityLevel()));
        if (issue.getStatus() == IssueStatus.OPEN
                && issue.getSlaStartTime() == null
                && !triaged) {
            status = "CREATED";
        }

        return IssueResponse.builder()
                .id(issue.getId())
                .title(issue.getTitle())
                .description(issue.getDescription())
                .severity("-".equals(String.valueOf(issue.getPriorityLevel())) ? "-" : issue.getSeverity().name())
                .status(status)
                .assignedEngineerId(issue.getAssignedEngineer() != null ? issue.getAssignedEngineer().getId() : null)
                .assignedEngineerName(issue.getAssignedEngineer() != null ? issue.getAssignedEngineer().getFullName() : null)
                .projectId(issue.getProject().getId())
                .projectName(issue.getProject().getName())
                .createdAt(issue.getCreatedAt())
                .resolvedAt(issue.getResolvedAt())
                .build();
    }
}
