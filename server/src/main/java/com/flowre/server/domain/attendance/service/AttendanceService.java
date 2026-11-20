package com.flowre.server.domain.attendance.service;

import com.flowre.server.domain.attendance.dto.AttendanceResponse;
import com.flowre.server.domain.attendance.dto.AttendanceUpdateRequest;
import com.flowre.server.domain.attendance.entity.AttendanceRecord;
import com.flowre.server.domain.attendance.entity.AttendanceStatus;
import com.flowre.server.domain.attendance.repository.AttendanceRecordRepository;
import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 직원 출근/퇴근 기록과 점장/본사 확인을 처리합니다. */
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private static final int MAX_LIMIT = 100;

    private final AttendanceRecordRepository attendanceRepository;
    private final AuditLogService auditLogService;

    /** 현재 사용자를 출근 처리합니다. */
    @Transactional
    public AttendanceResponse clockIn(User user) {
        LocalDate today = LocalDate.now();
        if (attendanceRepository.existsByBrandIdAndUserIdAndWorkDateAndStatus(
                user.getBrandId(), user.getId(), today, AttendanceStatus.WORKING)) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "이미 출근 처리된 근무 기록이 있습니다.");
        }
        AttendanceRecord record = AttendanceRecord.builder()
                .brandId(user.getBrandId())
                .storeId(user.getStoreId())
                .storeName(user.getStoreName())
                .userId(user.getId())
                .userName(user.getName())
                .workDate(today)
                .clockInAt(LocalDateTime.now())
                .status(AttendanceStatus.WORKING)
                .totalMinutes(0)
                .build();
        AttendanceRecord saved = attendanceRepository.save(record);
        auditLogService.record(user, AuditAction.ATTENDANCE_CLOCK_IN, "ATTENDANCE_RECORD", saved.getId(), "출근 처리");
        return AttendanceResponse.from(saved);
    }

    /** 현재 사용자의 열린 근무 기록을 퇴근 처리합니다. */
    @Transactional
    public AttendanceResponse clockOut(User user) {
        AttendanceRecord record = attendanceRepository
                .findByBrandIdAndUserIdAndWorkDateAndStatus(
                        user.getBrandId(), user.getId(), LocalDate.now(), AttendanceStatus.WORKING)
                .orElseThrow(() -> new CustomException(ErrorCode.ATTENDANCE_NOT_FOUND, "퇴근 처리할 출근 기록이 없습니다."));
        record.clockOut(LocalDateTime.now());
        auditLogService.record(user, AuditAction.ATTENDANCE_CLOCK_OUT, "ATTENDANCE_RECORD", record.getId(), "퇴근 처리");
        return AttendanceResponse.from(record);
    }

    /** 내 최근 근태 기록을 조회합니다. */
    @Transactional(readOnly = true)
    public List<AttendanceResponse> getMyRecords(User user, int limit) {
        return attendanceRepository
                .findByBrandIdAndUserIdOrderByWorkDateDescCreatedAtDesc(
                        user.getBrandId(), user.getId(), PageRequest.of(0, clampLimit(limit)))
                .stream()
                .map(AttendanceResponse::from)
                .toList();
    }

    /** 점장/본사가 날짜별 근태 목록을 조회합니다. */
    @Transactional(readOnly = true)
    public List<AttendanceResponse> getRecords(User user, Long storeId, LocalDate date, int limit) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        Long effectiveStoreId = user.getRole().canViewAllStores() ? storeId : user.getStoreId();
        List<AttendanceRecord> records = effectiveStoreId != null
                ? attendanceRepository.findByBrandIdAndStoreIdAndWorkDateOrderByCreatedAtDesc(
                        user.getBrandId(), effectiveStoreId, targetDate, PageRequest.of(0, clampLimit(limit)))
                : attendanceRepository.findByBrandIdAndWorkDateOrderByCreatedAtDesc(
                        user.getBrandId(), targetDate, PageRequest.of(0, clampLimit(limit)));
        return records.stream().map(AttendanceResponse::from).toList();
    }

    /** 점장/본사가 근태 기록을 보정합니다. */
    @Transactional
    public AttendanceResponse update(User user, Long id, AttendanceUpdateRequest request) {
        AttendanceRecord record = attendanceRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.ATTENDANCE_NOT_FOUND));
        assertCanModify(user, record.getStoreId());
        record.update(
                request.getClockInAt(),
                request.getClockOutAt(),
                request.getStatus(),
                StringUtils.hasText(request.getNote()) ? request.getNote().trim() : null
        );
        auditLogService.record(user, AuditAction.ATTENDANCE_UPDATED, "ATTENDANCE_RECORD", record.getId(), "근태 기록 수정");
        return AttendanceResponse.from(record);
    }

    private void assertCanModify(User user, Long storeId) {
        if (user.getRole().isHeadquarters()) {
            return;
        }
        if (user.getRole() == UserRole.STORE_MANAGER && user.getStoreId().equals(storeId)) {
            return;
        }
        throw new CustomException(ErrorCode.ATTENDANCE_FORBIDDEN);
    }

    private int clampLimit(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }
}

