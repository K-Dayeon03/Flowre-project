package com.flowre.server.domain.auth.controller;

import com.flowre.server.domain.auth.dto.FcmTokenRequest;
import com.flowre.server.domain.auth.dto.LoginRequest;
import com.flowre.server.domain.auth.dto.LoginResponse;
import com.flowre.server.domain.auth.service.AuthService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import com.flowre.server.global.response.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";
    private final AuthService authService;

    /**
     * POST /api/auth/login
     * 프론트: authApi.login(email, password)
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        LoginResponse result = authService.login(request);

        // Refresh Token은 HttpOnly Cookie로 내려줌
        addRefreshCookie(response, result.getAccessToken());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * POST /api/auth/logout
     * 프론트: authApi.logout()
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal User user,
            HttpServletResponse response
    ) {
        authService.logout(user.getId());
        authService.clearFcmToken(user.getId());
        clearRefreshCookie(response);
        return ResponseEntity.ok(ApiResponse.ok(null, "로그아웃 되었습니다."));
    }

    /**
     * GET /api/auth/me
     * 프론트: authApi.me(token)
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> me(
            @AuthenticationPrincipal User user
    ) {
        LoginResponse.UserInfo info = LoginResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole().name())
                .brandId(user.getBrandId())
                .storeId(user.getStoreId())
                .storeName(user.getStoreName())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    /**
     * POST /api/auth/refresh
     * 프론트: authApi.refresh() — Axios 인터셉터에서 401 시 자동 호출
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refresh(HttpServletRequest request) {
        String refreshToken = extractRefreshCookie(request);
        String newAccessToken = authService.refresh(refreshToken);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", newAccessToken)));
    }

    /**
     * POST /api/auth/fcm
     * 로그인 성공 후 FCM 토큰 등록
     */
    @PostMapping("/fcm")
    public ResponseEntity<ApiResponse<Void>> registerFcm(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody FcmTokenRequest request
    ) {
        authService.registerFcmToken(user.getId(), request.getFcmToken());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Cookie 헬퍼 ──────────────────────────────────────────────

    private void addRefreshCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7일
        response.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));
    }
}
