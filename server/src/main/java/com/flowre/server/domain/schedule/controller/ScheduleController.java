package com.flowre.server.domain.schedule.controller;

import com.flowre.server.domain.schedule.dto.ScheduleRequest;
import com.flowre.server.domain.schedule.dto.ScheduleResponse;
import com.flowre.server.domain.schedule.dto.ScheduleUpdateRequest;
import com.flowre.server.domain.schedule.entity.ScheduleStatus;
import com.flowre.server.domain.schedule.service.ScheduleService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    /** GET /api/schedules?status=PENDING */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getList(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) ScheduleStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getList(user, status)));
    }

    /** GET /api/schedules/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> getById(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getById(user, id)));
    }

    /** POST /api/schedules */
    @PostMapping
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ScheduleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.create(user, request)));
    }

    /** PUT /api/schedules/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody ScheduleUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.update(user, id, request)));
    }

    /** PATCH /api/schedules/{id}/complete */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<Void>> complete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        scheduleService.complete(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** DELETE /api/schedules/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        scheduleService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
