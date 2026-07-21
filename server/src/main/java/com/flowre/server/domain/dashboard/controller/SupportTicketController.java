package com.flowre.server.domain.dashboard.controller;

import com.flowre.server.domain.dashboard.dto.*;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import com.flowre.server.domain.dashboard.service.SupportTicketService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 문의(Inquiry) 및 AS 접수 티켓 REST API를 제공합니다.
 */
@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    // ===================== 문의(Inquiry) =====================

    /** GET /api/support/inquiries?storeId=&limit=10 — 문의 목록 조회 */
    @GetMapping("/inquiries")
    public ResponseEntity<ApiResponse<List<InquiryTicketResponse>>> getInquiries(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.getInquiries(user, storeId, limit)));
    }

    /** GET /api/support/inquiries/{id} — 문의 단건 조회 */
    @GetMapping("/inquiries/{id}")
    public ResponseEntity<ApiResponse<InquiryTicketResponse>> getInquiry(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.getInquiry(user, id)));
    }

    /** POST /api/support/inquiries — 문의 등록 */
    @PostMapping("/inquiries")
    public ResponseEntity<ApiResponse<InquiryTicketResponse>> createInquiry(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody InquiryTicketCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.createInquiry(user, request)));
    }

    /** PUT /api/support/inquiries/{id} — 문의 수정 */
    @PutMapping("/inquiries/{id}")
    public ResponseEntity<ApiResponse<InquiryTicketResponse>> updateInquiry(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody InquiryTicketUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.updateInquiry(user, id, request)));
    }

    /** DELETE /api/support/inquiries/{id} — 문의 삭제 */
    @DeleteMapping("/inquiries/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteInquiry(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        supportTicketService.deleteInquiry(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** PATCH /api/support/inquiries/{id}/status?status=IN_PROGRESS — 문의 상태 변경 */
    @PatchMapping("/inquiries/{id}/status")
    public ResponseEntity<ApiResponse<InquiryTicketResponse>> changeInquiryStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam InquiryStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.changeInquiryStatus(user, id, status)));
    }

    // ===================== AS 접수 티켓 =====================

    /** GET /api/support/as-tickets?storeId=&limit=10 — AS 접수 목록 조회 */
    @GetMapping("/as-tickets")
    public ResponseEntity<ApiResponse<List<AsTicketResponse>>> getAsTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.getAsTickets(user, storeId, limit)));
    }

    /** GET /api/support/as-tickets/{id} — AS 접수 단건 조회 */
    @GetMapping("/as-tickets/{id}")
    public ResponseEntity<ApiResponse<AsTicketResponse>> getAsTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.getAsTicket(user, id)));
    }

    /** POST /api/support/as-tickets — AS 접수 등록 */
    @PostMapping("/as-tickets")
    public ResponseEntity<ApiResponse<AsTicketResponse>> createAsTicket(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AsTicketCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.createAsTicket(user, request)));
    }

    /** PUT /api/support/as-tickets/{id} — AS 접수 수정 */
    @PutMapping("/as-tickets/{id}")
    public ResponseEntity<ApiResponse<AsTicketResponse>> updateAsTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody AsTicketUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.updateAsTicket(user, id, request)));
    }

    /** DELETE /api/support/as-tickets/{id} — AS 접수 삭제 */
    @DeleteMapping("/as-tickets/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAsTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        supportTicketService.deleteAsTicket(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** PATCH /api/support/as-tickets/{id}/status?status=IN_PROGRESS — AS 접수 상태 변경 */
    @PatchMapping("/as-tickets/{id}/status")
    public ResponseEntity<ApiResponse<AsTicketResponse>> changeAsTicketStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam AsTicketStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supportTicketService.changeAsTicketStatus(user, id, status)));
    }
}
