package com.flowre.server.domain.notification.controller;

import com.flowre.server.domain.notification.dto.NotificationResponse;
import com.flowre.server.domain.notification.service.NotificationService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** GET /api/notifications?limit=50 — 내 알림 목록 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getMyNotifications(user, limit)));
    }

    /** GET /api/notifications/unread-count — 안읽음 개수 */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", notificationService.getUnreadCount(user))));
    }

    /** POST /api/notifications/{id}/read — 단건 읽음 처리 */
    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        notificationService.markRead(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** POST /api/notifications/read-all — 전체 읽음 처리 */
    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(
            @AuthenticationPrincipal User user
    ) {
        notificationService.markAllRead(user);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
