package com.flowre.server.domain.store.controller;

import com.flowre.server.domain.store.dto.StoreCreateRequest;
import com.flowre.server.domain.store.dto.StoreResponse;
import com.flowre.server.domain.store.service.StoreService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    /** GET /api/stores - 브랜드 내 점별 매장 목록을 조회합니다. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StoreResponse>>> getStores(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(storeService.getStores(user)));
    }

    /** POST /api/stores - 브랜드 내 점별 매장을 등록합니다. */
    @PostMapping
    public ResponseEntity<ApiResponse<StoreResponse>> createStore(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody StoreCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(storeService.createStore(user, request)));
    }
}
