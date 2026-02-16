package com.marketplace.controller;


import com.marketplace.dto.request.LoginRequest;
import com.marketplace.dto.request.RegisterCustomerRequest;
import com.marketplace.dto.request.RegisterProviderRequest;
import com.marketplace.dto.request.ForgotPasswordRequest;
import com.marketplace.dto.request.ResetPasswordRequest;
import com.marketplace.dto.response.ApiResponse;
import com.marketplace.dto.response.LoginResponse;
import com.marketplace.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/customer")
    public ResponseEntity<LoginResponse> registerCustomer(@Valid @RequestBody RegisterCustomerRequest request) {
        LoginResponse response = authService.registerCustomer(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register/provider")
    public ResponseEntity<LoginResponse> registerProvider(@Valid @RequestBody RegisterProviderRequest request) {
        LoginResponse response = authService.registerProvider(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-email/{token}")
    public ResponseEntity<ApiResponse> verifyEmail(@PathVariable String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully"));
    }
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Password reset email sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully"));
    }
}
