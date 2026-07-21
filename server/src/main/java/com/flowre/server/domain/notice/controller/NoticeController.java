package com.flowre.server.domain.notice.controller;

import com.flowre.server.domain.notice.dto.NoticeCreateRequest;
import com.flowre.server.domain.notice.dto.NoticeResponse;
import com.flowre.server.domain.notice.dto.UnreadCountResponse;
import com.flowre.server.domain.notice.service.NoticeService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    /** GET /api/notices */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NoticeResponse>>> getNotices(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.getNotices(user)));
    }

    /** GET /api/notices/unread-count */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<UnreadCountResponse>> getUnreadCount(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.getUnreadCount(user)));
    }

    /** GET /api/notices/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoticeResponse>> getNotice(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.getNotice(user, id)));
    }

    /** POST /api/notices */
    @PostMapping
    public ResponseEntity<ApiResponse<NoticeResponse>> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody NoticeCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.create(user, request)));
    }

    /** POST /api/notices/{id}/read */
    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        noticeService.markRead(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** PUT /api/notices/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NoticeResponse>> update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody NoticeCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.update(user, id, request)));
    }

    /** DELETE /api/notices/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        noticeService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
