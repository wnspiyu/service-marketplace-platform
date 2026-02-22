package com.marketplace.service;

import com.marketplace.dto.request.CreateReviewRequest;
import com.marketplace.dto.response.ReviewResponse;
import com.marketplace.entity.*;
import com.marketplace.exception.BadRequestException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.QuotationRepository;
import com.marketplace.repository.ReviewRepository;
import com.marketplace.repository.TaskRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final QuotationRepository quotationRepository;

    @Transactional
    public ReviewResponse createReview(CreateReviewRequest request, Long customerId) {
        // Verify customer exists
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (customer.getUserType() != UserType.CUSTOMER) {
            throw new UnauthorizedException("Only customers can create reviews");
        }

        // Verify task exists and belongs to customer
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (!task.getCustomer().getId().equals(customerId)) {
            throw new UnauthorizedException("You can only review tasks you created");
        }

        // Verify task is completed
        if (task.getStatus() != TaskStatus.COMPLETED) {
            throw new BadRequestException("You can only review completed tasks");
        }

        // Check if review already exists
        if (reviewRepository.existsByTaskId(request.getTaskId())) {
            throw new BadRequestException("You have already reviewed this task");
        }

        // Get the accepted quotation to find the service provider
        if (task.getSelectedQuotationId() == null) {
            throw new BadRequestException("No quotation was selected for this task");
        }

        Quotation quotation = quotationRepository.findById(task.getSelectedQuotationId())
                .orElseThrow(() -> new ResourceNotFoundException("Selected quotation not found"));

        User serviceProvider = quotation.getServiceProvider();

        // Create review
        Review review = new Review();
        review.setTask(task);
        review.setCustomer(customer);
        review.setServiceProvider(serviceProvider);
        review.setRating(request.getRating());
        review.setComment(request.getComment());

        review = reviewRepository.save(review);

        return mapToReviewResponse(review);
    }

    public List<ReviewResponse> getReviewsByProvider(Long providerId) {
        return reviewRepository.findByServiceProviderIdOrderByCreatedAtDesc(providerId).stream()
                .map(this::mapToReviewResponse)
                .collect(Collectors.toList());
    }

    public ReviewResponse getReviewByTask(Long taskId) {
        Review review = reviewRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found for this task"));

        return mapToReviewResponse(review);
    }

    private ReviewResponse mapToReviewResponse(Review review) {
        ReviewResponse response = new ReviewResponse();
        response.setId(review.getId());
        response.setTaskId(review.getTask().getId());
        response.setTaskTitle(review.getTask().getTitle());
        response.setCustomerId(review.getCustomer().getId());
        response.setCustomerName(review.getCustomer().getFirstName() + " " + review.getCustomer().getLastName());
        response.setServiceProviderId(review.getServiceProvider().getId());
        response.setProviderName(review.getServiceProvider().getFirstName() + " " +
                review.getServiceProvider().getLastName());
        response.setRating(review.getRating());
        response.setComment(review.getComment());
        response.setCreatedAt(review.getCreatedAt());

        return response;
    }
}
