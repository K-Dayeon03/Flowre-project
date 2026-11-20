package com.flowre.server.domain.attendance.controller;

import com.flowre.server.domain.attendance.dto.AttendanceResponse;
import com.flowre.server.domain.attendance.dto.AttendanceUpdateRequest;
import com.flowre.server.domain.attendance.service.AttendanceService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** 직원 근태 REST API입니다. */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    /** POST /api/attendance/clock-in */
    @PostMapping("/clock-in")
    public ResponseEntity<ApiResponse<AttendanceResponse>> clockIn(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.clockIn(user)));
    }

    /** POST /api/attendance/clock-out */
    @PostMapping("/clock-out")
    public ResponseEntity<ApiResponse<AttendanceResponse>> clockOut(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.clockOut(user)));
    }

    /** GET /api/attendance/me?limit=30 */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> myRecords(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "30") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.getMyRecords(user, limit)));
    }

    /** GET /api/attendance?storeId=&date=2026-08-05&limit=100 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> records(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "100") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.getRecords(user, storeId, date, limit)));
    }

    /** PATCH /api/attendance/{id} */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody AttendanceUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(attendanceService.update(user, id, request)));
    }
}

