package com.flowre.server.domain.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 인앱 알림 — 수신자(recipient)에게 전달되는 단건 알림.
 * 브랜드 단위로 격리하며, FCM 푸시와 별개로 앱 내 알림함에서 조회·읽음 처리된다.
 */
@Entity
@Table(
        name = "notifications",
        indexes = @Index(name = "idx_notifications_recipient", columnList = "recipient_id, is_read, created_at")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long recipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    /** 연관 리소스 유형 (예: EMPLOYEE, SCHEDULE, INVENTORY_ITEM). */
    private String relatedType;

    /** 연관 리소스 ID — 알림 탭 시 상세 화면으로 이동하는 데 사용. */
    private Long relatedId;

    // 'read'는 일부 DB 예약어라 컬럼명을 is_read로 둔다.
    @Column(name = "is_read", nullable = false)
    private boolean read;

    @CreatedDate
    private LocalDateTime createdAt;

    /** 알림을 읽음 처리한다. */
    public void markRead() {
        this.read = true;
    }
}
