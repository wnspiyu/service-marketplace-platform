package com.marketplace.service;

import com.marketplace.entity.ServiceProviderProfile;
import com.marketplace.repository.ServiceProviderProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final ServiceProviderProfileRepository providerRepository;

    /**
     * Calculate distance between two points using Haversine formula
     * Returns distance in kilometers
     */
    public double calculateDistance(BigDecimal lat1, BigDecimal lon1, BigDecimal lat2, BigDecimal lon2) {
        final int EARTH_RADIUS_KM = 6371;

        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLon = Math.toRadians(lon2.doubleValue() - lon1.doubleValue());

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1.doubleValue())) *
                        Math.cos(Math.toRadians(lat2.doubleValue())) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }

    /**
     * Find all service providers within the specified radius of a location
     */
    public List<ServiceProviderProfile> findProvidersWithinRadius(
            BigDecimal latitude,
            BigDecimal longitude,
            Integer radiusKm,
            Long categoryId) {

        // Get all providers of the specified category
        List<ServiceProviderProfile> allProviders = providerRepository.findByCategoryId(categoryId);

        // Filter providers within radius
        return allProviders.stream()
                .filter(provider -> {
                    double distance = calculateDistance(
                            latitude, longitude,
                            provider.getLatitude(), provider.getLongitude()
                    );
                    return distance <= radiusKm;
                })
                .collect(Collectors.toList());
    }
}
