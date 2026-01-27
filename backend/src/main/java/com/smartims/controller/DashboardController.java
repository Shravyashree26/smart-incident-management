package com.smartims.controller;

import com.smartims.dto.DashboardSummaryResponse;
import com.smartims.dto.KeyValueCountResponse;
import com.smartims.entity.Issue;
import com.smartims.repository.IssueRepository;
import com.smartims.service.DashboardService;
import com.smartims.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class DashboardController {

    private final DashboardService dashboardService;
    private final IssueRepository issueRepository;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return dashboardService.getSummary();
    }

    @GetMapping("/status")
    public List<KeyValueCountResponse> statusWise() {
        return dashboardService.getStatusDistribution();
    }

    @GetMapping("/severity")
    public List<KeyValueCountResponse> severityWise() {
        return dashboardService.getSeverityDistribution();
    }

    @GetMapping("/priority")
    public List<KeyValueCountResponse> priorityWise() {
        return dashboardService.getPriorityDistribution();
    }

    @GetMapping("/sla-breaches")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public List<Issue> getSlaBreaches() {
        return issueRepository.findBySlaBreachedTrue();
    }

}
