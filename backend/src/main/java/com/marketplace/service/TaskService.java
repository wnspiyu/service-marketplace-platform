package com.marketplace.service;

import com.marketplace.dto.request.CreateTaskRequest;
import com.marketplace.dto.response.TaskResponse;
import com.marketplace.entity.*;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final TaskNotificationRepository notificationRepository;

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request, Long customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getUserType() != UserType.CUSTOMER) {
            throw new UnauthorizedException("Only customers can create tasks");
        }

        ServiceCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Service category not found"));

        Task task = new Task();
        task.setCustomer(customer);
        task.setCategory(category);
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setLatitude(request.getLatitude());
        task.setLongitude(request.getLongitude());
        task.setAddress(request.getAddress());
        task.setSearchRadiusKm(request.getSearchRadiusKm());
        task.setBudgetMin(request.getBudgetMin());
        task.setBudgetMax(request.getBudgetMax());
        task.setPreferredDate(request.getPreferredDate());
        task.setStatus(TaskStatus.OPEN);

        task = taskRepository.save(task);

        return mapToTaskResponse(task);
    }

    public List<TaskResponse> getTasksByCustomer(Long customerId) {
        return taskRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::mapToTaskResponse)
                .collect(Collectors.toList());
    }

    public TaskResponse getTaskById(Long taskId, Long userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (!task.getCustomer().getId().equals(userId)) {
            boolean isNotifiedProvider = notificationRepository.existsByTaskIdAndServiceProviderId(taskId, userId);
            if (!isNotifiedProvider) {
                throw new UnauthorizedException("You do not have access to this task");
            }
        }

        return mapToTaskResponse(task);
    }

    @Transactional
    public void updateTaskStatus(Long taskId, Long customerId, TaskStatus status) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (!task.getCustomer().getId().equals(customerId)) {
            throw new UnauthorizedException("You can only update your own tasks");
        }

        task.setStatus(status);
        taskRepository.save(task);
    }

    private TaskResponse mapToTaskResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setCustomerId(task.getCustomer().getId());
        response.setCustomerName(task.getCustomer().getFirstName() + " " + task.getCustomer().getLastName());
        response.setCustomerEmail(task.getCustomer().getEmail());
        response.setCategoryId(task.getCategory().getId());
        response.setCategoryName(task.getCategory().getName());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        response.setLatitude(task.getLatitude());
        response.setLongitude(task.getLongitude());
        response.setAddress(task.getAddress());
        response.setSearchRadiusKm(task.getSearchRadiusKm());
        response.setBudgetMin(task.getBudgetMin());
        response.setBudgetMax(task.getBudgetMax());
        response.setPreferredDate(task.getPreferredDate());
        response.setStatus(task.getStatus());
        response.setSelectedQuotationId(task.getSelectedQuotationId());
        response.setCreatedAt(task.getCreatedAt());
        response.setUpdatedAt(task.getUpdatedAt());

        return response;
    }
}