package com.flowre.server.domain.attendance.service;

import com.flowre.server.domain.attendance.entity.AttendanceRecord;
import com.flowre.server.domain.attendance.entity.AttendanceStatus;
import com.flowre.server.domain.attendance.repository.AttendanceRecordRepository;
import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AttendanceServiceTest {

    private AttendanceRecordRepository attendanceRepository;
    private AuditLogService auditLogService;
    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        attendanceRepository = mock(AttendanceRecordRepository.class);
        auditLogService = mock(AuditLogService.class);
        attendanceService = new AttendanceService(attendanceRepository, auditLogService);
    }

    @Test
    void clockInCreatesWorkingRecord() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        when(attendanceRepository.existsByBrandIdAndUserIdAndWorkDateAndStatus(
                eq(1L), eq(10L), any(LocalDate.class), eq(AttendanceStatus.WORKING)))
                .thenReturn(false);
        when(attendanceRepository.save(any(AttendanceRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = attendanceService.clockIn(user);

        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.WORKING.name());
        assertThat(result.getClockInAt()).isNotNull();
        verify(auditLogService).record(eq(user), any(), eq("ATTENDANCE_RECORD"), any(), eq("출근 처리"));
    }

    @Test
    void clockInFailsWhenWorkingRecordAlreadyExists() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        when(attendanceRepository.existsByBrandIdAndUserIdAndWorkDateAndStatus(
                eq(1L), eq(10L), any(LocalDate.class), eq(AttendanceStatus.WORKING)))
                .thenReturn(true);

        assertThatThrownBy(() -> attendanceService.clockIn(user))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void clockOutClosesWorkingRecord() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        AttendanceRecord record = record(1L, 1001L, LocalDateTime.now().minusHours(3), AttendanceStatus.WORKING);
        when(attendanceRepository.findByBrandIdAndUserIdAndWorkDateAndStatus(
                eq(1L), eq(10L), any(LocalDate.class), eq(AttendanceStatus.WORKING)))
                .thenReturn(Optional.of(record));

        var result = attendanceService.clockOut(user);

        assertThat(result.getStatus()).isEqualTo(AttendanceStatus.OFF.name());
        assertThat(result.getTotalMinutes()).isGreaterThanOrEqualTo(179);
    }

    @Test
    void storeStaffCannotUpdateAttendance() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        when(attendanceRepository.findByIdAndBrandId(1L, 1L))
                .thenReturn(Optional.of(record(1L, 1001L, LocalDateTime.now(), AttendanceStatus.WORKING)));

        assertThatThrownBy(() -> attendanceService.update(user, 1L, new com.flowre.server.domain.attendance.dto.AttendanceUpdateRequest()))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ATTENDANCE_FORBIDDEN);
    }

    private AttendanceRecord record(Long id, Long storeId, LocalDateTime clockInAt, AttendanceStatus status) {
        return AttendanceRecord.builder()
                .id(id)
                .brandId(1L)
                .storeId(storeId)
                .storeName("강남점")
                .userId(10L)
                .userName("사용자")
                .workDate(LocalDate.now())
                .clockInAt(clockInAt)
                .status(status)
                .totalMinutes(0)
                .build();
    }

    private User user(UserRole role, Long storeId) {
        return User.builder()
                .id(10L)
                .email("user@flowre.com")
                .employeeCode(storeId + "USER!")
                .password("encoded")
                .name("사용자")
                .role(role)
                .brandId(1L)
                .storeId(storeId)
                .storeCode(String.valueOf(storeId))
                .storeName("강남점")
                .build();
    }
}

