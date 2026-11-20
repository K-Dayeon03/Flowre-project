package com.flowre.server.domain.auth.service;

import com.flowre.server.domain.auth.dto.LoginRequest;
import com.flowre.server.domain.auth.dto.LoginResponse;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import com.flowre.server.global.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String REFRESH_KEY_PREFIX = "refresh:";
    private static final Pattern EMPLOYEE_CODE_PATTERN = Pattern.compile("^\\d{4}[A-Za-z]{4}[!@#$%^&*?]$");

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, String> redisTemplate;

    private void redisSave(String key, String value, long ttlMs) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlMs, TimeUnit.MILLISECONDS);
        } catch (DataAccessException e) {
            log.error("[Auth] Redis 저장 실패", e);
            throw new CustomException(ErrorCode.AUTH_STORAGE_UNAVAILABLE, e);
        }
    }

    private String redisGet(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (DataAccessException e) {
            log.error("[Auth] Redis 조회 실패", e);
            throw new CustomException(ErrorCode.AUTH_STORAGE_UNAVAILABLE, e);
        }
    }

    private void redisDelete(String key) {
        try {
            redisTemplate.delete(key);
        } catch (DataAccessException e) {
            log.error("[Auth] Redis 삭제 실패", e);
            throw new CustomException(ErrorCode.AUTH_STORAGE_UNAVAILABLE, e);
        }
    }

    /**
     * 로그인 — Access Token 발급 + Refresh Token을 Redis에 저장
     */
    @Transactional(readOnly = true)
    public LoginResult login(LoginRequest request) {
        //입력한 코드 검사
        // 점별 코드: "1234"
        // 직원 아이디: "1234abcd!"
        validateLoginCodes(request);
        //DB에서 직원 찾기
        //입력한 직원 아이디로 DB를 조회해서 직원이 있으며 user담고, 없으면 로그인 실패 예외를 발생시킨다.
        User user = userRepository.findByEmployeeCode(request.getEmployeeCode())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }
        //직원의 매장 코드와 비교
        if (!request.getStoreCode().equals(user.getStoreCode())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }
        //해당 브랜드에 활성화된 매장이 있는 조회
        storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(user.getBrandId(), request.getStoreCode())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        // 점장 승인 상태 검증 — PENDING(승인 대기)·REJECTED(거절) 계정은 로그인 불가
        switch (user.getStatus()) {
            case PENDING -> throw new CustomException(ErrorCode.ACCOUNT_PENDING_APPROVAL);
            case REJECTED -> throw new CustomException(ErrorCode.ACCOUNT_REJECTED);
            default -> { /* ACTIVE: 로그인 진행 */ }
        }
        /**
         * 검사를 모두 통과하면 로그인에 사용할 토큰 두가지를 발급
         * Access Token	스케줄 조회 같은 API 요청에서 로그인한 사용자임을 증명
         * Refresh Token Access Token이 만료됐을 때 새 Access Token을 발급받는 데 사용
         */
        /**
         * access token은 서버가 서명과 만료 시간을 검증해서 유효한지 확인할 수 있다.
         * 지금처럼 JWT를 쓰면 발급한 토큰ㄴ을 Redis에 하나하나 저장할 필요ㅎ가 없다.
         */
        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), //회원 번호
                user.getEmail(), //이메일
                user.getRole().name()); //역할을 문자열로 변환

        String refreshToken = jwtUtil.generateRefreshToken(
                user.getId()); //회원번호를 전달해 갱신용 토큰을 만들고 담는다

        // Refresh Token → Redis (key: "refresh:{userId}"), 저장 실패 시 로그인 중단
        //예: 회원번ㄴ호가 3이면 레디스에  refresh:3을 저장할 키로 사용
        redisSave(REFRESH_KEY_PREFIX + user.getId(), refreshToken, jwtUtil.getRefreshExpirationMs());

        return new LoginResult(LoginResponse.of(accessToken, user), refreshToken);
    }

    private void validateLoginCodes(LoginRequest request) {
        if (request.getStoreCode() == null || request.getEmployeeCode() == null) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!EMPLOYEE_CODE_PATTERN.matcher(request.getEmployeeCode()).matches()) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }
        // "1234abcd!".startsWith("1234") → true
        if (!request.getEmployeeCode().startsWith(request.getStoreCode())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }
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
        if (!jwtUtil.isRefreshToken(refreshToken)) {
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

    public record LoginResult(LoginResponse response, String refreshToken) {
    }
}
