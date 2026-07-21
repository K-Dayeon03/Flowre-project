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

    /** 직원 코드 마지막 로테이션 시각 — null이면 최초 발급 이후 한 번도 순환되지 않은 상태 */
    private LocalDateTime codeRotatedAt;

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

    /** ADMIN 계정(부트스트랩)인지 여부를 반환합니다. ADMIN은 코드 로테이션 대상에서 제외됩니다. */
    public boolean isAdmin() {
        return this.role == UserRole.ADMIN;
    }

    /** 이름·이메일을 수정합니다. */
    public void updateInfo(String name, String email) {
        this.name = name;
        this.email = email;
    }

    /** 비밀번호를 변경합니다 (BCrypt 암호화 후 전달해야 합니다). */
    public void resetPassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    /** 직원 코드를 새 코드로 교체하고 로테이션 시각을 기록합니다. */
    public void rotateCode(String newEmployeeCode) {
        this.employeeCode = newEmployeeCode;
        this.codeRotatedAt = LocalDateTime.now();
    }

    /** 계정을 비활성화합니다. ADMIN 계정은 비활성화할 수 없습니다. */
    public void deactivate() {
        this.status = UserStatus.REJECTED;
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
