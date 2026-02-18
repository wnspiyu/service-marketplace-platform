package com.marketplace.repository;

import com.marketplace.entity.TaskNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskNotificationRepository extends JpaRepository<TaskNotification, Long> {
    boolean existsByTaskIdAndServiceProviderId(Long taskId, Long serviceProviderId);
}
