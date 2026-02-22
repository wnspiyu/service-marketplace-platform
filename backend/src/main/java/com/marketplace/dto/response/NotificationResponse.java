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
public class NotificationResponse {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private String taskDescription;
    private String taskAddress;
    private BigDecimal taskLatitude;
    private BigDecimal taskLongitude;
    private Integer searchRadiusKm;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private LocalDate preferredDate;
    private TaskStatus taskStatus;
    private String customerName;
    private String categoryName;
    private Boolean isViewed;
    private Boolean isDeclined;
    private LocalDateTime viewedAt;
    private LocalDateTime declinedAt;
    private LocalDateTime createdAt;
    private Double distanceKm;
    private Boolean hasQuotation;
}
