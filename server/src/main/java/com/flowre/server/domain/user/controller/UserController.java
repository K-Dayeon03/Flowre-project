package com.flowre.server.domain.user.controller;

import com.flowre.server.domain.user.dto.EmployeeCreateRequest;
import com.flowre.server.domain.user.dto.UserResponse;
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

    /** GET /api/employees - 같은 브랜드의 직원 계정 목록을 조회합니다. (본사 전용) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getEmployees(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getEmployees(user)));
    }

    /** POST /api/employees - 신규 직원 계정을 발급합니다. (본사 전용) */
    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createEmployee(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody EmployeeCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.createEmployee(user, request)));
    }
}
