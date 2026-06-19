package com.flowre.server.domain.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 감사 로그 — 누가(actor) 언제 어떤 작업(action)을 어떤 대상(target)에 했는지 기록한다.
 * 브랜드 단위로 격리해 조회하며, 본사·관리자가 운영 추적·분쟁 대응에 사용한다.
 */
@Entity
@Table(
        name = "audit_logs",
        indexes = {
                @Index(name = "idx_audit_logs_brand_created", columnList = "brand_id, created_at"),
                @Index(name = "idx_audit_logs_actor", columnList = "actor_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long actorId;

    @Column(nullable = false)
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    /** 대상 리소스 유형 (예: SCHEDULE, INVENTORY_ITEM, EMPLOYEE). */
    private String targetType;

    /** 대상 리소스 ID. */
    private Long targetId;

    /** 사람이 읽을 수 있는 부가 설명 (예: "재고 3개 차감 - 파손"). */
    @Column(columnDefinition = "TEXT")
    private String detail;

    @CreatedDate
    private LocalDateTime createdAt;
}
