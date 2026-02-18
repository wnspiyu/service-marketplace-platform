package com.marketplace.controller;

import com.marketplace.dto.request.CreateTaskRequest;
import com.marketplace.dto.response.*;
import com.marketplace.entity.TaskStatus;
import com.marketplace.security.UserDetailsImpl;
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
}
