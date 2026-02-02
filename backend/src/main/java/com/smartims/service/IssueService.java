package com.smartims.service;

import com.smartims.dto.CreateIssueRequest;
import com.smartims.dto.IssueResponse;
import com.smartims.dto.SlaComplianceResponse;
import com.smartims.dto.SlaStatusResponse;
import com.smartims.entity.Issue;
import com.smartims.enums.IssueStatus;

import java.util.List;

public interface IssueService {

    long countByStatus(IssueStatus status);

    void createIssue(CreateIssueRequest request, String createdBy);

    List<Issue> getIssuesByProject(Long projectId);


    void updateIssueStatus(
            Long issueId,
            IssueStatus newStatus,
            String role
    );

    void assignEngineer(Long issueId, Long engineerId);

    void autoAssignEngineer(Long issueId);

    SlaStatusResponse getSlaStatus(Long issueId);

    SlaComplianceResponse getSlaComplianceSummary();

    IssueResponse getIssueById(Long id);

    List<IssueResponse> getAllIssues();

    IssueResponse assignIssue(Long issueId, Long engineerId);

    List<IssueResponse> getIssuesByEngineer(Long engineerId);

}
