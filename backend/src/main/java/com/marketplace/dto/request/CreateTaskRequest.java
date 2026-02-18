package com.marketplace.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Category is required")
    private Long categoryId;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Search radius is required")
    @Min(value = 1, message = "Search radius must be at least 1 km")
    @Max(value = 200, message = "Search radius cannot exceed 200 km")
    private Integer searchRadiusKm;

    @DecimalMin(value = "0.0", message = "Budget must be positive")
    private BigDecimal budgetMin;

    @DecimalMin(value = "0.0", message = "Budget must be positive")
    private BigDecimal budgetMax;

    private LocalDate preferredDate;
}
