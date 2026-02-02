package com.smartims.controller;

import com.smartims.dto.ApiResponse;
import com.smartims.dto.SlaCreateRequest;
import com.smartims.dto.SlaResponse;
import com.smartims.dto.UpdateSlaPolicyRequest;
import com.smartims.entity.SlaPolicy;
import com.smartims.repository.SlaPolicyRepository;
import com.smartims.service.AdminSlaService;
import com.smartims.service.NotificationService;
import com.smartims.service.SlaService;
import com.smartims.util.ResponseUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/sla")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminSlaController {

    private final SlaPolicyRepository slaPolicyRepository;
    private final NotificationService notificationService;
    private final AdminSlaService adminSlaService;
    private final SlaService slaService;


//    @PostMapping
//    public SlaPolicy createPolicy(@RequestBody SlaPolicy policy) {
//        return slaPolicyRepository.save(policy);
//    }

    @PostMapping
    public ResponseEntity<ApiResponse<SlaResponse>> createPolicy(
            @RequestBody @Valid SlaCreateRequest request) {

        return ResponseUtil.success(
                HttpStatus.OK,
                "SLA policy created successfully",
                slaService.createSla(request)
        );
    }


    @PutMapping("/{projectId}/{priorityLevel}")
    public SlaPolicy updatePolicy(
            @PathVariable Long projectId,
            @PathVariable String priorityLevel,
            @RequestBody UpdateSlaPolicyRequest request) {

        return adminSlaService.updatePolicy(
                projectId, priorityLevel, request
        );
    }

    @GetMapping
    public List<SlaPolicy> getAllPolicies() {
        return slaPolicyRepository.findAll();
    }

}
