package com.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceProviderResponse {
    private Long id;
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private Long categoryId;
    private String categoryName;
    private String businessName;
    private String bio;
    private Integer yearsOfExperience;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String address;
    private Integer serviceRadiusKm;
    private BigDecimal averageRating;
    private Integer totalReviews;
    private Integer totalTasksCompleted;
    private Double distanceKm; // Distance from search location
}
