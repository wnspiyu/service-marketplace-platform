package com.marketplace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceCategoryResponse {
    private Long id;
    private String name;
    private String description;
    private String iconUrl;
}
