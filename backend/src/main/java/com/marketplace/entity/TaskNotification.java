package com.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_notifications", schema = "marketplace",
        uniqueConstraints = @UniqueConstraint(columnNames = {"task_id", "service_provider_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne
    @JoinColumn(name = "service_provider_id", nullable = false)
    private User serviceProvider;

    @Column(name = "is_viewed")
    private Boolean isViewed = false;

    @Column(name = "is_declined")
    private Boolean isDeclined = false;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
