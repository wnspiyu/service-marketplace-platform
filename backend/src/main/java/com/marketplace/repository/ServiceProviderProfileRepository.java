package com.marketplace.repository;

import com.marketplace.entity.ServiceProviderProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceProviderProfileRepository extends JpaRepository<ServiceProviderProfile, Long> {

    Optional<ServiceProviderProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<ServiceProviderProfile> findByCategoryId(Long categoryId);

    @Query("SELECT sp FROM ServiceProviderProfile sp WHERE sp.category.id = :categoryId")
    List<ServiceProviderProfile> findAllByCategoryId(@Param("categoryId") Long categoryId);
}
