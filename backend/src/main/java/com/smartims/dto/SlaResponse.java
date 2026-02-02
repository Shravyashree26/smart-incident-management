package com.smartims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SlaResponse {

    private Long id;
    private String priorityLevel;
    private Integer resolutionTimeMinutes;
    private String description;

    private Long projectId;
    private String projectName;
}
