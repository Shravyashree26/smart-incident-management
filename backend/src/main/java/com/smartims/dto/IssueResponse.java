package com.smartims.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueResponse {

    private Long id;
    private String title;
    private String description;
    private String severity;
    private String status;

    private Long projectId;
    private String projectName;

    private LocalDateTime createdAt;
}
