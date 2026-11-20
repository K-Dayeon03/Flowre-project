package com.flowre.server.domain.hub.controller;

import com.flowre.server.domain.hub.dto.HubSearchResultResponse;
import com.flowre.server.domain.hub.dto.HubSummaryResponse;
import com.flowre.server.domain.hub.service.HubService;
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

/** 본사-매장 커뮤니케이션 허브 REST API입니다. */
@RestController
@RequestMapping("/api/hub")
@RequiredArgsConstructor
public class HubController {

    private final HubService hubService;

    /** GET /api/hub/summary */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<HubSummaryResponse>> summary(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(hubService.getSummary(user)));
    }

    /** GET /api/hub/search?query= */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<HubSearchResultResponse>>> search(
            @AuthenticationPrincipal User user,
            @RequestParam String query
    ) {
        return ResponseEntity.ok(ApiResponse.ok(hubService.search(user, query)));
    }
}

