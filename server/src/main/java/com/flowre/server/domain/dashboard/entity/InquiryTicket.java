package com.flowre.server.domain.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 홈 대시보드의 최근 문의 항목입니다.
 */
@Entity
@Table(
        name = "dashboard_inquiry_tickets",
        indexes = {
                @Index(name = "idx_dashboard_inquiry_brand_created", columnList = "brand_id, created_at"),
                @Index(name = "idx_dashboard_inquiry_brand_store_created", columnList = "brand_id, store_id, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InquiryTicket {

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
    private String requesterName;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InquiryStatus status = InquiryStatus.PENDING;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public void update(String title, String content, InquiryStatus status) {
        this.title = title;
        this.content = content;
        if (status != null) {
            this.status = status;
        }
    }

    public void changeStatus(InquiryStatus status) {
        this.status = status;
    }
}
