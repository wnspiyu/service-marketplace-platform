package com.marketplace.controller;

import com.marketplace.dto.response.ServiceCategoryResponse;
import com.marketplace.service.ServiceCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class ServiceCategoryController {

    private final ServiceCategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<ServiceCategoryResponse>> getAllCategories() {
        List<ServiceCategoryResponse> categories = categoryService.getAllActiveCategories();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceCategoryResponse> getCategoryById(@PathVariable Long id) {
        ServiceCategoryResponse category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(category);
    }
}
