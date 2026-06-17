package com.flowre.server.domain.favorite.controller;

import com.flowre.server.domain.favorite.dto.FavoriteCreateRequest;
import com.flowre.server.domain.favorite.dto.FavoriteResponse;
import com.flowre.server.domain.favorite.service.FavoriteService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    /** GET /api/favorites */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FavoriteResponse>>> getFavorites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(favoriteService.getFavorites(user)));
    }

    /** POST /api/favorites */
    @PostMapping
    public ResponseEntity<ApiResponse<FavoriteResponse>> add(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody FavoriteCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(favoriteService.add(user, request)));
    }

    /** DELETE /api/favorites/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> remove(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        favoriteService.remove(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
