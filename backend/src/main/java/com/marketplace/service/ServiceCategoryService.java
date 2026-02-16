package com.marketplace.service;

import com.marketplace.dto.response.ServiceCategoryResponse;
import com.marketplace.entity.ServiceCategory;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.repository.ServiceCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceCategoryService {

    private final ServiceCategoryRepository categoryRepository;

    public List<ServiceCategoryResponse> getAllActiveCategories() {
        return categoryRepository.findByIsActiveTrue().stream()
                .map(this::mapToCategoryResponse)
                .collect(Collectors.toList());
    }

    public ServiceCategoryResponse getCategoryById(Long id) {
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service category not found"));

        return mapToCategoryResponse(category);
    }

    private ServiceCategoryResponse mapToCategoryResponse(ServiceCategory category) {
        ServiceCategoryResponse response = new ServiceCategoryResponse();
        response.setId(category.getId());
        response.setName(category.getName());
        response.setDescription(category.getDescription());
        response.setIconUrl(category.getIconUrl());
        return response;
    }
}
