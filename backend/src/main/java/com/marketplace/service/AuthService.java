package com.marketplace.service;

import com.marketplace.dto.request.LoginRequest;
import com.marketplace.dto.request.RegisterCustomerRequest;
import com.marketplace.dto.request.RegisterProviderRequest;
import com.marketplace.dto.response.LoginResponse;
import com.marketplace.entity.*;
import com.marketplace.exception.BadRequestException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.repository.*;
import com.marketplace.security.JwtTokenProvider;
import com.marketplace.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final ServiceProviderProfileRepository providerProfileRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;

    @Transactional
    public LoginResponse registerCustomer(RegisterCustomerRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        // Create user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setUserType(UserType.CUSTOMER);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setIsEmailVerified(false);
        user.setIsActive(true);

        user = userRepository.save(user);

        // Create customer profile
        CustomerProfile customerProfile = new CustomerProfile();
        customerProfile.setUser(user);
        customerProfile.setAddress(request.getAddress());
        customerProfileRepository.save(customerProfile);

        // Generate JWT token
        String jwtToken = tokenProvider.generateTokenFromUserId(user.getId());

        return new LoginResponse(
                jwtToken,
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getUserType()
        );
    }

    @Transactional
    public LoginResponse registerProvider(RegisterProviderRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        // Check if category exists
        ServiceCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Service category not found"));

        // Create user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setUserType(UserType.SERVICE_PROVIDER);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setIsEmailVerified(false);
        user.setIsActive(true);

        user = userRepository.save(user);

        // Create service provider profile
        ServiceProviderProfile providerProfile = new ServiceProviderProfile();
        providerProfile.setUser(user);
        providerProfile.setCategory(category);
        providerProfile.setBusinessName(request.getBusinessName());
        providerProfile.setBio(request.getBio());
        providerProfile.setYearsOfExperience(request.getYearsOfExperience());
        providerProfile.setLatitude(request.getLatitude());
        providerProfile.setLongitude(request.getLongitude());
        providerProfile.setAddress(request.getAddress());
        providerProfile.setServiceRadiusKm(request.getServiceRadiusKm() != null ? request.getServiceRadiusKm() : 50);
        providerProfileRepository.save(providerProfile);
        // Generate JWT token
        String jwtToken = tokenProvider.generateTokenFromUserId(user.getId());

        return new LoginResponse(
                jwtToken,
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getUserType()
        );
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        return new LoginResponse(
                jwt,
                userDetails.getId(),
                userDetails.getEmail(),
                null, // firstName not in UserDetails
                null, // lastName not in UserDetails
                userDetails.getUserType()
        );
    }
}
