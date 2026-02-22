package com.marketplace.controller;

import com.marketplace.dto.request.CreateReviewRequest;
import com.marketplace.dto.request.CreateTaskRequest;
import com.marketplace.dto.response.*;
import com.marketplace.entity.TaskStatus;
import com.marketplace.security.UserDetailsImpl;
import com.marketplace.service.QuotationService;
import com.marketplace.service.ReviewService;
import com.marketplace.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerController {

    private final TaskService taskService;
    private final QuotationService quotationService;
    private final ReviewService reviewService;

    // Task Management

    @PostMapping("/tasks")
    public ResponseEntity<TaskResponse> createTask(
            @Valid @RequestBody CreateTaskRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        TaskResponse task = taskService.createTask(request, userDetails.getId());
        return ResponseEntity.ok(task);
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<TaskResponse>> getMyTasks(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<TaskResponse> tasks = taskService.getTasksByCustomer(userDetails.getId());
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponse> getTaskDetails(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        TaskResponse task = taskService.getTaskById(taskId, userDetails.getId());
        return ResponseEntity.ok(task);
    }

    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<ApiResponse> updateTaskStatus(
            @PathVariable Long taskId,
            @RequestParam TaskStatus status,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        taskService.updateTaskStatus(taskId, userDetails.getId(), status);
        return ResponseEntity.ok(ApiResponse.success("Task status updated successfully"));
    }
    // Quotation Management

    @GetMapping("/tasks/{taskId}/quotations")
    public ResponseEntity<List<QuotationResponse>> getTaskQuotations(
            @PathVariable Long taskId) {
        List<QuotationResponse> quotations = quotationService.getQuotationsByTask(taskId);
        return ResponseEntity.ok(quotations);
    }

    @PutMapping("/quotations/{quotationId}/accept")
    public ResponseEntity<ApiResponse> acceptQuotation(
            @PathVariable Long quotationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        quotationService.acceptQuotation(quotationId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Quotation accepted successfully"));
    }

    @PutMapping("/quotations/{quotationId}/reject")
    public ResponseEntity<ApiResponse> rejectQuotation(
            @PathVariable Long quotationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        quotationService.rejectQuotation(quotationId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Quotation rejected"));
    }

    // Review Management

    @PostMapping("/reviews")
    public ResponseEntity<ReviewResponse> createReview(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        ReviewResponse review = reviewService.createReview(request, userDetails.getId());
        return ResponseEntity.ok(review);
    }

    @GetMapping("/reviews/task/{taskId}")
    public ResponseEntity<ReviewResponse> getTaskReview(@PathVariable Long taskId) {
        ReviewResponse review = reviewService.getReviewByTask(taskId);
        return ResponseEntity.ok(review);
    }
}
