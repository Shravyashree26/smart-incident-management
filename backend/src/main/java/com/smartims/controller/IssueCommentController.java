package com.smartims.controller;

import com.smartims.dto.ApiResponse;
import com.smartims.dto.IssueCommentRequest;
import com.smartims.dto.IssueCommentResponse;
import com.smartims.service.IssueCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues/{issueId}/comments")
@RequiredArgsConstructor
public class IssueCommentController {

    private final IssueCommentService commentService;

    // Add comment
    @PostMapping
    public ApiResponse<IssueCommentResponse> addComment(
            @PathVariable Long issueId,
            @RequestBody IssueCommentRequest request) {

        IssueCommentResponse response =
                commentService.addComment(issueId, request.getComment());

        return  ApiResponse.success(
                "Comment added successfully",
                response
        );
    }

    // Get comments
    @GetMapping
    public ApiResponse<List<IssueCommentResponse>> getComments(
            @PathVariable Long issueId) {

        List<IssueCommentResponse> response =
                commentService.getComments(issueId);

        return  ApiResponse.success(
                "Issue comments fetched successfully",
                response
        );
    }
}
