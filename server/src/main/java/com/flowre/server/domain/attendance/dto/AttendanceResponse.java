package com.flowre.server.domain.attendance.dto;

import com.flowre.server.domain.attendance.entity.AttendanceRecord;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class AttendanceResponse {

    private Long id;
    private Long storeId;
    private String storeName;
    private Long userId;
    private String userName;
    private LocalDate workDate;
    private LocalDateTime clockInAt;
    private LocalDateTime clockOutAt;
    private String status;
    private Integer totalMinutes;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 엔티티를 근태 응답으로 변환합니다. */
    public static AttendanceResponse from(AttendanceRecord record) {
        return AttendanceResponse.builder()
                .id(record.getId())
                .storeId(record.getStoreId())
                .storeName(record.getStoreName())
                .userId(record.getUserId())
                .userName(record.getUserName())
                .workDate(record.getWorkDate())
                .clockInAt(record.getClockInAt())
                .clockOutAt(record.getClockOutAt())
                .status(record.getStatus().name())
                .totalMinutes(record.getTotalMinutes())
                .note(record.getNote())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }
}

