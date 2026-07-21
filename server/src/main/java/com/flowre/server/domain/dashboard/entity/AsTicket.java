package com.flowre.server.domain.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 홈 대시보드의 AS 접수 항목입니다.
 */
@Entity
@Table(
        name = "dashboard_as_tickets",
        indexes = {
                @Index(name = "idx_dashboard_as_brand_created", columnList = "brand_id, created_at"),
                @Index(name = "idx_dashboard_as_brand_store_created", columnList = "brand_id, store_id, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AsTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private String storeName;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AsTicketStatus status = AsTicketStatus.NEW;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AsTicketPriority priority = AsTicketPriority.NORMAL;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public void update(String title, String description, AsTicketStatus status, AsTicketPriority priority) {
        this.title = title;
        this.description = description;
        if (status != null) {
            this.status = status;
        }
        if (priority != null) {
            this.priority = priority;
        }
    }

    public void changeStatus(AsTicketStatus status) {
        this.status = status;
    }
}
