package com.marketplace.repository;

import com.marketplace.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByServiceProviderIdOrderByCreatedAtDesc(Long serviceProviderId);

    Optional<Review> findByTaskId(Long taskId);

    boolean existsByTaskId(Long taskId);

    @Transactional
    @Modifying
    void deleteByTaskId(Long taskId);
}
