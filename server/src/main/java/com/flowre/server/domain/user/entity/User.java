package com.flowre.server.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_employee_code", columnList = "employee_code"),
                @Index(name = "idx_users_brand_store_code", columnList = "brand_id, store_code")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String employeeCode;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    /**
     * 계정 승인 상태 — 신규 매장 직원은 점장 승인 전까지 PENDING. 기본값 ACTIVE.
     *
     * columnDefinition으로 DB 기본값('ACTIVE')을 부여해, 기존 데이터가 있는 테이블에
     * ddl-auto=update로 NOT NULL 컬럼이 추가될 때도 안전하게 마이그레이션되도록 한다.
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) not null default 'ACTIVE'")
    private UserStatus status = UserStatus.ACTIVE;

    /** 계정을 발급한 본사 권한자 ID (감사 추적용) */
    private Long registeredById;

    /** 승인/거절을 결정한 점장(또는 관리자) ID */
    private Long decidedById;

    /** 승인/거절 결정 시각 */
    private LocalDateTime decidedAt;

    /** 거절 사유 (REJECTED인 경우) */
    private String rejectReason;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private String storeCode;

    @Column(nullable = false)
    private String storeName;

    private String fcmToken;

    @CreatedDate
    private LocalDateTime createdAt;

    public void updateFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }

    public void clearFcmToken() {
        this.fcmToken = null;
    }

    /** 계정이 활성 상태(로그인 가능)인지 여부를 반환합니다. */
    public boolean isActive() {
        return this.status == UserStatus.ACTIVE;
    }

    /** 승인 대기(PENDING) 상태인지 여부를 반환합니다. */
    public boolean isPending() {
        return this.status == UserStatus.PENDING;
    }

    /** 점장(또는 관리자)이 직원 계정을 승인해 활성화합니다. */
    public void approve(Long approverId, LocalDateTime decidedAt) {
        this.status = UserStatus.ACTIVE;
        this.decidedById = approverId;
        this.decidedAt = decidedAt;
        this.rejectReason = null;
    }

    /** 점장(또는 관리자)이 직원 계정을 거절합니다. */
    public void reject(Long approverId, String reason, LocalDateTime decidedAt) {
        this.status = UserStatus.REJECTED;
        this.decidedById = approverId;
        this.decidedAt = decidedAt;
        this.rejectReason = reason;
    }
}
