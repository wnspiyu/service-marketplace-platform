package com.marketplace.dto.response;

import com.marketplace.entity.QuotationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuotationResponse {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private Long serviceProviderId;
    private String providerName;
    private String providerBusinessName;
    private String providerEmail;
    private String providerPhone;
    private BigDecimal providerRating;
    private Integer providerTotalReviews;
    private BigDecimal price;
    private String estimatedDuration;
    private String message;
    private QuotationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
