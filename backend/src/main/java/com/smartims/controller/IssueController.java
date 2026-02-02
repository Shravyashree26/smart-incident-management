package com.smartims.controller;

import com.smartims.dto.*;
import com.smartims.entity.Issue;
import com.smartims.service.IssueService;
import com.smartims.util.ResponseUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','USER')")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createIssue(
            @Valid @RequestBody CreateIssueRequest request,
            Authentication authentication
    ) {
        String email = authentication.getName();

        issueService.createIssue(request, email);

        return ResponseUtil.success(
                HttpStatus.OK,
                "Issue created successfully",
                null
        );
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateIssueStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateIssueStatusRequest request,
            Authentication authentication
    ) {
        String role = authentication.getAuthorities()
                .iterator()
                .next()
                .getAuthority();

        issueService.updateIssueStatus(id, request.getStatus(), role);

        return ResponseUtil.success(
                HttpStatus.OK,
                "Issue status updated successfully",
                null
        );
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public ResponseEntity<ApiResponse<List<Issue>>> getIssuesByProject(
            @PathVariable Long projectId) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "Project issues fetched successfully",
                issueService.getIssuesByProject(projectId)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IssueResponse>> getIssueById(
            @PathVariable Long id) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "Issue fetched successfully",
                issueService.getIssueById(id)
        );
    }

    @GetMapping("/{id}/issues")
    public ResponseEntity<ApiResponse<List<IssueResponse>>> getEngineerIssues(
            @PathVariable Long id) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "Engineer issues fetched successfully",
                issueService.getIssuesByEngineer(id)
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<IssueResponse>>> getAllIssues() {

        return ResponseUtil.success(
                HttpStatus.OK,
                "Issues fetched successfully",
                issueService.getAllIssues()
        );
    }

    @PutMapping("/{issueId}/assign/{engineerId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> assignEngineer(
            @PathVariable Long issueId,
            @PathVariable Long engineerId) {

        issueService.assignEngineer(issueId, engineerId);

        return ResponseUtil.success(
                HttpStatus.OK,
                "Engineer assigned successfully",
                null
        );
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<IssueResponse>> assignIssue(
            @PathVariable Long id,
            @RequestBody AssignIssueRequest request) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "Issue assigned successfully",
                issueService.assignIssue(id, request.getEngineerId())
        );
    }

    @PutMapping("/{issueId}/auto-assign")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> autoAssignEngineer(
            @PathVariable Long issueId) {

        issueService.autoAssignEngineer(issueId);

        return ResponseUtil.success(
                HttpStatus.OK,
                "Engineer auto-assigned successfully",
                null
        );
    }

    @GetMapping("/{id}/sla-status")
    public ResponseEntity<ApiResponse<SlaStatusResponse>> getSlaStatus(
            @PathVariable Long id) {

        SlaStatusResponse response = issueService.getSlaStatus(id);

        return ResponseUtil.success(
                HttpStatus.OK,
                "SLA status fetched successfully",
                response
        );
    }

    @GetMapping("/sla/compliance")
    public ResponseEntity<ApiResponse<SlaComplianceResponse>> getSlaCompliance() {

        SlaComplianceResponse response =
                issueService.getSlaComplianceSummary();

        return ResponseUtil.success(
                HttpStatus.OK,
                "SLA compliance summary fetched successfully",
                response
        );
    }


}
