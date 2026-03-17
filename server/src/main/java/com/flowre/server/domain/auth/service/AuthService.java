package com.flowre.server.domain.auth.service;

import com.flowre.server.domain.auth.dto.LoginRequest;
import com.flowre.server.domain.auth.dto.LoginResponse;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import com.flowre.server.global.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String REFRESH_KEY_PREFIX = "refresh:";

    /** Redis 미연결 시 사용하는 인메모리 폴백 (개발·테스트 전용) */
    private final ConcurrentHashMap<String, String> inMemoryStore = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, String> redisTemplate;

    private void redisSave(String key, String value, long ttlMs) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.warn("[Auth] Redis 저장 실패 — 인메모리 폴백 사용. key={}", key);
            inMemoryStore.put(key, value);
        }
    }

    private String redisGet(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.warn("[Auth] Redis 조회 실패 — 인메모리 폴백 사용. key={}", key);
            return inMemoryStore.get(key);
        }
    }

    private void redisDelete(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("[Auth] Redis 삭제 실패 — 인메모리 폴백 사용. key={}", key);
            inMemoryStore.remove(key);
        }
    }

    /**
     * 로그인 — Access Token 발급 + Refresh Token을 Redis에 저장
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        // Refresh Token → Redis (key: "refresh:{userId}"), Redis 미연결 시 인메모리 폴백
        redisSave(REFRESH_KEY_PREFIX + user.getId(), refreshToken, jwtUtil.getRefreshExpirationMs());

        return LoginResponse.of(accessToken, user);
    }

    /**
     * 로그아웃 — Redis의 Refresh Token 삭제
     */
    public void logout(Long userId) {
        redisDelete(REFRESH_KEY_PREFIX + userId);
        log.info("[Auth] 로그아웃 userId={}", userId);
    }

    /**
     * 토큰 갱신 — Refresh Token 검증 후 새 Access Token 발급
     */
    @Transactional(readOnly = true)
    public String refresh(String refreshToken) {
        if (!jwtUtil.isValid(refreshToken)) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        Long userId = jwtUtil.getUserId(refreshToken);
        String stored = redisGet(REFRESH_KEY_PREFIX + userId);

        if (stored == null || !stored.equals(refreshToken)) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        return jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
    }

    /**
     * FCM 토큰 등록
     */
    @Transactional
    public void registerFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        user.updateFcmToken(fcmToken);
    }

    /**
     * FCM 토큰 삭제 (로그아웃 시 호출)
     */
    @Transactional
    public void clearFcmToken(Long userId) {
        userRepository.findById(userId).ifPresent(User::clearFcmToken);
    }
}
