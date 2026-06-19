package com.flowre.server.domain.audit.controller;

import com.flowre.server.domain.audit.dto.AuditLogResponse;
import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    /** GET /api/audit-logs?action=INVENTORY_DEDUCTED&limit=100 — 본사·관리자 전용 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getLogs(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(defaultValue = "100") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getLogs(user, action, limit)));
    }
}
