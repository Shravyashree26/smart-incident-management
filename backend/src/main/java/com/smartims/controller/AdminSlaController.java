package com.smartims.controller;

import com.smartims.dto.UpdateSlaPolicyRequest;
import com.smartims.entity.SlaPolicy;
import com.smartims.repository.SlaPolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/sla")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminSlaController {

    private final SlaPolicyRepository slaPolicyRepository;

    @PostMapping
    public SlaPolicy createPolicy(@RequestBody SlaPolicy policy) {
        return slaPolicyRepository.save(policy);
    }

    @PutMapping("/{priorityLevel}")
    public SlaPolicy updatePolicy(
            @PathVariable String priorityLevel,
            @RequestBody UpdateSlaPolicyRequest request) {

        SlaPolicy policy = slaPolicyRepository.findByPriorityLevel(priorityLevel)
                .orElseThrow(() ->
                        new RuntimeException("SLA policy not found for priority " + priorityLevel)
                );

        policy.setResolutionTimeMinutes(request.getResolutionTimeMinutes());
        return slaPolicyRepository.save(policy);
    }


    @GetMapping
    public List<SlaPolicy> getAllPolicies() {
        return slaPolicyRepository.findAll();
    }
}
