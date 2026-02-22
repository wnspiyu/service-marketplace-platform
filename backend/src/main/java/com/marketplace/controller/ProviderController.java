package com.marketplace.controller;

import com.marketplace.dto.response.ApiResponse;
import com.marketplace.dto.response.QuotationResponse;
import com.marketplace.security.UserDetailsImpl;
import com.marketplace.service.NotificationService;
import com.marketplace.service.QuotationService;
import com.marketplace.dto.request.CreateQuotationRequest;
import com.marketplace.dto.response.NotificationResponse;
import com.marketplace.dto.response.ReviewResponse;
import com.marketplace.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/provider")
@RequiredArgsConstructor
public class ProviderController {

    private final QuotationService quotationService;
    private final NotificationService notificationService;
    private final ReviewService reviewService;

    // Quotation Management

    @PostMapping("/quotations")
    public ResponseEntity<QuotationResponse> submitQuotation(
            @Valid @RequestBody CreateQuotationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        QuotationResponse quotation = quotationService.submitQuotation(request, userDetails.getId());
        return ResponseEntity.ok(quotation);
    }

    @GetMapping("/quotations")
    public ResponseEntity<List<QuotationResponse>> getMyQuotations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<QuotationResponse> quotations = quotationService.getQuotationsByProvider(userDetails.getId());
        return ResponseEntity.ok(quotations);
    }

    @PutMapping("/quotations/{quotationId}/withdraw")
    public ResponseEntity<ApiResponse> withdrawQuotation(
            @PathVariable Long quotationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        quotationService.withdrawQuotation(quotationId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Quotation withdrawn"));
    }

    // Notification Management

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<NotificationResponse> notifications = notificationService.getProviderNotifications(userDetails.getId());
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/notifications/unviewed")
    public ResponseEntity<List<NotificationResponse>> getUnviewedNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<NotificationResponse> notifications = notificationService.getUnviewedNotifications(userDetails.getId());
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/notifications/unviewed-count")
    public ResponseEntity<Long> getUnviewedCount(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        long count = notificationService.getUnviewedCount(userDetails.getId());
        return ResponseEntity.ok(count);
    }

    @PutMapping("/notifications/{notificationId}/view")
    public ResponseEntity<ApiResponse> markAsViewed(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.markAsViewed(notificationId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Notification marked as viewed"));
    }

    @PutMapping("/notifications/{notificationId}/decline")
    public ResponseEntity<ApiResponse> declineTask(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.declineTask(notificationId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Task declined"));
    }

    // Review Management

    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponse>> getMyReviews(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<ReviewResponse> reviews = reviewService.getReviewsByProvider(userDetails.getId());
        return ResponseEntity.ok(reviews);
    }
}
