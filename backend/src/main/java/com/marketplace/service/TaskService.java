package com.marketplace.service;

import com.marketplace.dto.request.CreateTaskRequest;
import com.marketplace.dto.response.ServiceProviderResponse;
import com.marketplace.dto.response.TaskResponse;
import com.marketplace.entity.*;
import com.marketplace.exception.BadRequestException;
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
    private final QuotationRepository quotationRepository;
    private final ReviewRepository reviewRepository;
    private final LocationService locationService;
    private final EmailService emailService;

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request, Long customerId) {
        // Verify user exists and is a customer
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getUserType() != UserType.CUSTOMER) {
            throw new UnauthorizedException("Only customers can create tasks");
        }

        // Verify category exists
        ServiceCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Service category not found"));

        // Create task
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

        // Find service providers within radius
        List<ServiceProviderProfile> providers = locationService.findProvidersWithinRadius(
                request.getLatitude(),
                request.getLongitude(),
                request.getSearchRadiusKm(),
                request.getCategoryId()
        );

        // Create notifications for each provider and send emails
        for (ServiceProviderProfile provider : providers) {
            TaskNotification notification = new TaskNotification();
            notification.setTask(task);
            notification.setServiceProvider(provider.getUser());
            notification.setIsViewed(false);
            notification.setIsDeclined(false);
            notificationRepository.save(notification);

            // Send email notification
            emailService.sendTaskNotificationEmail(provider.getUser(), task);
        }

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

        // Verify user has access to this task (either customer or notified provider)
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

    @Transactional
    public void deleteTask(Long taskId, Long customerId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        // Verify the customer owns this task
        if (!task.getCustomer().getId().equals(customerId)) {
            throw new UnauthorizedException("You can only delete your own tasks");
        }

        // Check if task has an accepted quotation
        if (task.getStatus() == TaskStatus.IN_PROGRESS) {
            throw new BadRequestException("Cannot delete a task that is in progress. Please complete or cancel the task first.");
        }

        // Delete associated reviews (if any)
        reviewRepository.deleteByTaskId(taskId);

        // Delete associated notifications
        notificationRepository.deleteByTaskId(taskId);

        // Delete associated quotations
        quotationRepository.deleteByTaskId(taskId);

        // Delete the task
        taskRepository.delete(task);
    }

    public List<ServiceProviderResponse> getNotifiedProviders(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        List<TaskNotification> notifications = notificationRepository.findByTaskId(taskId);

        return notifications.stream()
                .map(notification -> {
                    User provider = notification.getServiceProvider();
                    ServiceProviderProfile profile = provider.getServiceProviderProfile();

                    ServiceProviderResponse response = new ServiceProviderResponse();
                    response.setId(profile.getId());
                    response.setUserId(provider.getId());
                    response.setFirstName(provider.getFirstName());
                    response.setLastName(provider.getLastName());
                    response.setEmail(provider.getEmail());
                    response.setPhoneNumber(provider.getPhoneNumber());
                    response.setCategoryId(profile.getCategory().getId());
                    response.setCategoryName(profile.getCategory().getName());
                    response.setBusinessName(profile.getBusinessName());
                    response.setBio(profile.getBio());
                    response.setYearsOfExperience(profile.getYearsOfExperience());
                    response.setLatitude(profile.getLatitude());
                    response.setLongitude(profile.getLongitude());
                    response.setAddress(profile.getAddress());
                    response.setServiceRadiusKm(profile.getServiceRadiusKm());
                    response.setAverageRating(profile.getAverageRating());
                    response.setTotalReviews(profile.getTotalReviews());
                    response.setTotalTasksCompleted(profile.getTotalTasksCompleted());

                    // Calculate distance
                    double distance = locationService.calculateDistance(
                            task.getLatitude(), task.getLongitude(),
                            profile.getLatitude(), profile.getLongitude()
                    );
                    response.setDistanceKm(distance);

                    return response;
                })
                .collect(Collectors.toList());
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

        // Get quotation count
        int quotationCount = quotationRepository.findByTaskId(task.getId()).size();
        response.setQuotationCount(quotationCount);

        return response;
    }
}
