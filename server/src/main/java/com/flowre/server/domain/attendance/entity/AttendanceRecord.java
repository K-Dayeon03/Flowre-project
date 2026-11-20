package com.flowre.server.domain.attendance.entity;

import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 직원의 하루 출근/퇴근 기록입니다. */
@Entity
@Table(
        name = "attendance_records",
        indexes = {
                @Index(name = "idx_attendance_brand_store_date", columnList = "brand_id, store_id, work_date"),
                @Index(name = "idx_attendance_brand_user_date", columnList = "brand_id, user_id, work_date")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AttendanceRecord {

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
    private Long userId;

    @Column(nullable = false)
    private String userName;

    @Column(nullable = false)
    private LocalDate workDate;

    private LocalDateTime clockInAt;

    private LocalDateTime clockOutAt;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status = AttendanceStatus.WORKING;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalMinutes = 0;

    private String note;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** 퇴근 처리하고 근무 시간을 계산합니다. */
    public void clockOut(LocalDateTime clockOutAt) {
        if (this.clockInAt == null || !clockOutAt.isAfter(this.clockInAt)) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "퇴근 시각은 출근 시각보다 늦어야 합니다.");
        }
        this.clockOutAt = clockOutAt;
        this.totalMinutes = Math.toIntExact(Duration.between(this.clockInAt, clockOutAt).toMinutes());
        this.status = AttendanceStatus.OFF;
    }

    /** 점장/본사가 근태 기록을 보정합니다. */
    public void update(LocalDateTime clockInAt, LocalDateTime clockOutAt, AttendanceStatus status, String note) {
        this.clockInAt = clockInAt;
        this.clockOutAt = clockOutAt;
        this.status = status != null ? status : this.status;
        this.note = note;
        if (clockInAt != null && clockOutAt != null) {
            if (!clockOutAt.isAfter(clockInAt)) {
                throw new CustomException(ErrorCode.INVALID_INPUT, "퇴근 시각은 출근 시각보다 늦어야 합니다.");
            }
            this.totalMinutes = Math.toIntExact(Duration.between(clockInAt, clockOutAt).toMinutes());
            this.status = AttendanceStatus.OFF;
        } else if (this.status == AttendanceStatus.ON_LEAVE) {
            this.totalMinutes = 0;
        }
    }
}

