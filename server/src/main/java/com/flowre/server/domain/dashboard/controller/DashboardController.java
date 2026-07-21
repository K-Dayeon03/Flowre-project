package com.flowre.server.domain.dashboard.controller;

import com.flowre.server.domain.dashboard.dto.HomeDashboardResponse;
import com.flowre.server.domain.dashboard.service.DashboardService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 홈 대시보드 요약 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/home")
    public ResponseEntity<ApiResponse<HomeDashboardResponse>> getHome(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "3") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getHome(user, limit)));
    }
}
