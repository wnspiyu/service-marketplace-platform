package com.marketplace.repository;

import com.marketplace.entity.TaskNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskNotificationRepository extends JpaRepository<TaskNotification, Long> {

    List<TaskNotification> findByServiceProviderIdOrderByCreatedAtDesc(Long serviceProviderId);

    List<TaskNotification> findByServiceProviderIdAndIsViewedFalse(Long serviceProviderId);

    List<TaskNotification> findByTaskId(Long taskId);

    Optional<TaskNotification> findByTaskIdAndServiceProviderId(Long taskId, Long serviceProviderId);

    boolean existsByTaskIdAndServiceProviderId(Long taskId, Long serviceProviderId);

    long countByServiceProviderIdAndIsViewedFalse(Long serviceProviderId);

    @Transactional
    @Modifying
    void deleteByTaskId(Long taskId);
}
