package com.smartims.mapper;

import com.smartims.dto.SlaResponse;
import com.smartims.entity.SlaPolicy;

public class SlaMapper {

    public static SlaResponse toResponse(SlaPolicy sla) {

        return SlaResponse.builder()
                .id(sla.getId())
                .priorityLevel(sla.getPriorityLevel())
                .resolutionTimeMinutes(sla.getResolutionTimeMinutes())
                .description(sla.getDescription())
                .projectId(sla.getProject().getId())
                .projectName(sla.getProject().getName())
                .build();
    }
}
