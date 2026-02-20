package com.marketplace.controller;

import com.marketplace.dto.response.ApiResponse;
import com.marketplace.dto.response.QuotationResponse;
import com.marketplace.security.UserDetailsImpl;
import com.marketplace.service.QuotationService;
import com.marketplace.dto.request.CreateQuotationRequest;
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

    // Review Management

//    @GetMapping("/reviews")
//    public ResponseEntity<List<ReviewResponse>> getMyReviews(
//            @AuthenticationPrincipal UserDetailsImpl userDetails) {
//        List<ReviewResponse> reviews = reviewService.getReviewsByProvider(userDetails.getId());
//        return ResponseEntity.ok(reviews);
//    }
}
