package com.marketplace.service;

import com.marketplace.dto.response.NotificationResponse;
import com.marketplace.entity.QuotationStatus;
import com.marketplace.entity.TaskNotification;
import com.marketplace.entity.TaskStatus;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.QuotationRepository;
import com.marketplace.repository.TaskNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final TaskNotificationRepository notificationRepository;
    private final QuotationRepository quotationRepository;
    private final LocationService locationService;

    public List<NotificationResponse> getProviderNotifications(Long providerId) {
        List<TaskNotification> notifications = notificationRepository
                .findByServiceProviderIdOrderByCreatedAtDesc(providerId);

        return notifications.stream()
                .filter(notification -> {
                    TaskStatus status = notification.getTask().getStatus();
                    // Always show OPEN tasks
                    if (status == TaskStatus.OPEN) return true;
                    // For IN_PROGRESS tasks, only show if this provider's quotation was accepted
                    if (status == TaskStatus.IN_PROGRESS) {
                        return quotationRepository.existsByTaskIdAndServiceProviderIdAndStatus(
                                notification.getTask().getId(), providerId, QuotationStatus.ACCEPTED);
                    }
                    return false;
                })
                .map(this::mapToNotificationResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getUnviewedNotifications(Long providerId) {
        List<TaskNotification> notifications = notificationRepository
                .findByServiceProviderIdAndIsViewedFalse(providerId);

        return notifications.stream()
                .filter(notification -> notification.getTask().getStatus() == TaskStatus.OPEN)
                .map(this::mapToNotificationResponse)
                .collect(Collectors.toList());
    }

    public long getUnviewedCount(Long providerId) {
        return notificationRepository.countByServiceProviderIdAndIsViewedFalse(providerId);
    }

    @Transactional
    public void markAsViewed(Long notificationId, Long providerId) {
        TaskNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        // Verify provider owns this notification
        if (!notification.getServiceProvider().getId().equals(providerId)) {
            throw new UnauthorizedException("You can only view your own notifications");
        }

        if (!notification.getIsViewed()) {
            notification.setIsViewed(true);
            notification.setViewedAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void declineTask(Long notificationId, Long providerId) {
        TaskNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        // Verify provider owns this notification
        if (!notification.getServiceProvider().getId().equals(providerId)) {
            throw new UnauthorizedException("You can only decline your own notifications");
        }

        notification.setIsDeclined(true);
        notification.setDeclinedAt(LocalDateTime.now());
        notification.setIsViewed(true);
        notification.setViewedAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    private NotificationResponse mapToNotificationResponse(TaskNotification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setTaskId(notification.getTask().getId());
        response.setTaskTitle(notification.getTask().getTitle());
        response.setTaskDescription(notification.getTask().getDescription());
        response.setTaskAddress(notification.getTask().getAddress());
        response.setTaskLatitude(notification.getTask().getLatitude());
        response.setTaskLongitude(notification.getTask().getLongitude());
        response.setSearchRadiusKm(notification.getTask().getSearchRadiusKm());
        response.setBudgetMin(notification.getTask().getBudgetMin());
        response.setBudgetMax(notification.getTask().getBudgetMax());
        response.setPreferredDate(notification.getTask().getPreferredDate());
        response.setTaskStatus(notification.getTask().getStatus());
        response.setCustomerName(notification.getTask().getCustomer().getFirstName() + " " +
                notification.getTask().getCustomer().getLastName());
        response.setCategoryName(notification.getTask().getCategory().getName());
        response.setIsViewed(notification.getIsViewed());
        response.setIsDeclined(notification.getIsDeclined());
        response.setViewedAt(notification.getViewedAt());
        response.setDeclinedAt(notification.getDeclinedAt());
        response.setCreatedAt(notification.getCreatedAt());

        // Calculate distance from provider's location to task location
        double distance = locationService.calculateDistance(
                notification.getServiceProvider().getServiceProviderProfile().getLatitude(),
                notification.getServiceProvider().getServiceProviderProfile().getLongitude(),
                notification.getTask().getLatitude(),
                notification.getTask().getLongitude()
        );
        response.setDistanceKm(distance);

        // Check if provider has submitted a quotation
        boolean hasQuotation = quotationRepository.existsByTaskIdAndServiceProviderId(
                notification.getTask().getId(),
                notification.getServiceProvider().getId()
        );
        response.setHasQuotation(hasQuotation);

        return response;
    }
}
