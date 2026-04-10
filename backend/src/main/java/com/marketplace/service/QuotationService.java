package com.marketplace.service;

import com.marketplace.dto.request.CreateQuotationRequest;
import com.marketplace.dto.response.QuotationResponse;
import com.marketplace.entity.*;
import com.marketplace.exception.BadRequestException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.QuotationRepository;
import com.marketplace.repository.TaskNotificationRepository;
import com.marketplace.repository.TaskRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskNotificationRepository notificationRepository;
    private final EmailService emailService;

    @Transactional
    public QuotationResponse submitQuotation(CreateQuotationRequest request, Long providerId) {
        // Verify provider exists
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found"));

        if (provider.getUserType() != UserType.SERVICE_PROVIDER) {
            throw new UnauthorizedException("Only service providers can submit quotations");
        }

        // Verify task exists and is still open
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.OPEN) {
            throw new BadRequestException("Task is no longer accepting quotations");
        }

        // Verify provider was notified about this task
        TaskNotification notification = notificationRepository.findByTaskIdAndServiceProviderId(
                request.getTaskId(), providerId
        ).orElseThrow(() -> new BadRequestException("You were not notified about this task"));

        // Check if quotation already exists
        if (quotationRepository.existsByTaskIdAndServiceProviderId(request.getTaskId(), providerId)) {
            throw new BadRequestException("You have already submitted a quotation for this task");
        }

        // Create quotation
        Quotation quotation = new Quotation();
        quotation.setTask(task);
        quotation.setServiceProvider(provider);
        quotation.setPrice(request.getPrice());
        quotation.setEstimatedDuration(request.getEstimatedDuration());
        quotation.setMessage(request.getMessage());
        quotation.setStatus(QuotationStatus.PENDING);

        quotation = quotationRepository.save(quotation);

        // Mark notification as viewed
        notification.setIsViewed(true);
        notification.setViewedAt(LocalDateTime.now());
        notificationRepository.save(notification);

        // Send email to customer
        emailService.sendQuotationSubmittedEmail(task.getCustomer(), quotation);

        return mapToQuotationResponse(quotation);
    }

    public List<QuotationResponse> getQuotationsByTask(Long taskId) {
        return quotationRepository.findByTaskId(taskId).stream()
                .map(this::mapToQuotationResponse)
                .collect(Collectors.toList());
    }

    public List<QuotationResponse> getQuotationsByProvider(Long providerId) {
        return quotationRepository.findByServiceProviderIdOrderByCreatedAtDesc(providerId).stream()
                .map(this::mapToQuotationResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void acceptQuotation(Long quotationId, Long customerId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        // Verify customer owns the task
        if (!quotation.getTask().getCustomer().getId().equals(customerId)) {
            throw new UnauthorizedException("You can only accept quotations for your own tasks");
        }

        // Verify quotation is pending
        if (quotation.getStatus() != QuotationStatus.PENDING) {
            throw new BadRequestException("Quotation is no longer pending");
        }

        // Accept this quotation
        quotation.setStatus(QuotationStatus.ACCEPTED);
        quotationRepository.save(quotation);

        // Update task status to IN_PROGRESS and set selected quotation
        // Customer will mark it as COMPLETED when the work is actually finished
        Task task = quotation.getTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        task.setSelectedQuotationId(quotationId);
        taskRepository.save(task);

        // Reject all other quotations for this task and send declination emails
        List<Quotation> otherQuotations = quotationRepository.findByTaskIdAndStatus(
                task.getId(), QuotationStatus.PENDING
        );
        for (Quotation other : otherQuotations) {
            if (!other.getId().equals(quotationId)) {
                other.setStatus(QuotationStatus.REJECTED);
                quotationRepository.save(other);

                // Send declination email to rejected provider
                emailService.sendQuotationDeclinedEmail(other.getServiceProvider(), other);
            }
        }

        // Send acceptance email to selected provider
        emailService.sendQuotationAcceptedEmail(quotation.getServiceProvider(), quotation);
    }

    @Transactional
    public void rejectQuotation(Long quotationId, Long customerId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        // Verify customer owns the task
        if (!quotation.getTask().getCustomer().getId().equals(customerId)) {
            throw new UnauthorizedException("You can only reject quotations for your own tasks");
        }

        // Verify quotation is pending
        if (quotation.getStatus() != QuotationStatus.PENDING) {
            throw new BadRequestException("Quotation is no longer pending");
        }

        quotation.setStatus(QuotationStatus.REJECTED);
        quotationRepository.save(quotation);

        // Send rejection email to provider
        emailService.sendQuotationRejectedEmail(quotation.getServiceProvider(), quotation);
    }

    @Transactional
    public void withdrawQuotation(Long quotationId, Long providerId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        // Verify provider owns the quotation
        if (!quotation.getServiceProvider().getId().equals(providerId)) {
            throw new UnauthorizedException("You can only withdraw your own quotations");
        }

        // Verify quotation is pending
        if (quotation.getStatus() != QuotationStatus.PENDING) {
            throw new BadRequestException("Only pending quotations can be withdrawn");
        }

        quotation.setStatus(QuotationStatus.WITHDRAWN);
        quotationRepository.save(quotation);
    }

    private QuotationResponse mapToQuotationResponse(Quotation quotation) {
        User provider = quotation.getServiceProvider();
        ServiceProviderProfile profile = provider.getServiceProviderProfile();

        QuotationResponse response = new QuotationResponse();
        response.setId(quotation.getId());
        response.setTaskId(quotation.getTask().getId());
        response.setTaskTitle(quotation.getTask().getTitle());
        response.setServiceProviderId(provider.getId());
        response.setProviderName(provider.getFirstName() + " " + provider.getLastName());
        response.setProviderBusinessName(profile.getBusinessName());
        response.setProviderEmail(provider.getEmail());
        response.setProviderPhone(provider.getPhoneNumber());
        response.setProviderRating(profile.getAverageRating());
        response.setProviderTotalReviews(profile.getTotalReviews());
        response.setPrice(quotation.getPrice());
        response.setEstimatedDuration(quotation.getEstimatedDuration());
        response.setMessage(quotation.getMessage());
        response.setStatus(quotation.getStatus());
        response.setCreatedAt(quotation.getCreatedAt());
        response.setUpdatedAt(quotation.getUpdatedAt());

        return response;
    }
}
