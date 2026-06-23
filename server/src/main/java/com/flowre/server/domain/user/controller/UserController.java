package com.flowre.server.domain.user.controller;

import com.flowre.server.domain.user.dto.*;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.service.UserService;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** GET /api/employees — 같은 브랜드의 직원 계정 목록을 조회합니다. (본사 전용) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getEmployees(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getEmployees(user)));
    }

    /** POST /api/employees — 신규 직원 계정을 발급합니다. (본사 전용) */
    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createEmployee(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody EmployeeCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.createEmployee(user, request)));
    }

    /** PUT /api/employees/{id} — 직원 이름·이메일·역할을 수정합니다. (본사 전용, ADMIN 계정 제외) */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateEmployee(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody EmployeeUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateEmployee(user, id, request)));
    }

    /** DELETE /api/employees/{id} — 직원 계정을 비활성화합니다. (본사 전용, ADMIN·본인 계정 제외) */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEmployee(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        userService.deleteEmployee(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** PUT /api/employees/{id}/password — 직원 비밀번호를 초기화합니다. (본사 전용) */
    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<UserResponse>> resetPassword(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody EmployeePasswordResetRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.resetPassword(user, id, request.getNewPassword())));
    }

    /** POST /api/employees/{id}/rotate-code — 직원 코드를 즉시 로테이션합니다. (본사 전용) */
    @PostMapping("/{id}/rotate-code")
    public ResponseEntity<ApiResponse<EmployeeCodeRotateResponse>> rotateCode(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.rotateEmployeeCode(user, id)));
    }

    /** GET /api/employees/store-members — 같은 매장 활성 직원 목록 (채팅 대상 선택용, 본인 제외) */
    @GetMapping("/store-members")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getStoreMembers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getStoreMembers(user)));
    }

    /** GET /api/employees/pending — 승인 대기 직원 목록을 조회합니다. (점장·관리자 전용) */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getPendingEmployees(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getPendingEmployees(user)));
    }

    /** POST /api/employees/{employeeId}/approve — 승인 대기 직원을 승인합니다. (점장·관리자 전용) */
    @PostMapping("/{employeeId}/approve")
    public ResponseEntity<ApiResponse<UserResponse>> approveEmployee(
            @AuthenticationPrincipal User user,
            @PathVariable Long employeeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.approveEmployee(user, employeeId)));
    }

    /** POST /api/employees/{employeeId}/reject — 승인 대기 직원을 거절합니다. (점장·관리자 전용) */
    @PostMapping("/{employeeId}/reject")
    public ResponseEntity<ApiResponse<UserResponse>> rejectEmployee(
            @AuthenticationPrincipal User user,
            @PathVariable Long employeeId,
            @Valid @RequestBody EmployeeRejectRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.rejectEmployee(user, employeeId, request.getReason())));
    }
}
