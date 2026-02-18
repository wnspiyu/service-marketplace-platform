package com.marketplace.dto.response;

import com.marketplace.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private Long categoryId;
    private String categoryName;
    private String title;
    private String description;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String address;
    private Integer searchRadiusKm;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private LocalDate preferredDate;
    private TaskStatus status;
    private Long selectedQuotationId;
    private Integer quotationCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
