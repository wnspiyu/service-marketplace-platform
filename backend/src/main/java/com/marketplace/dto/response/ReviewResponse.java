package com.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private Long customerId;
    private String customerName;
    private Long serviceProviderId;
    private String providerName;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
