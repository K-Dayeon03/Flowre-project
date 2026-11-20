package com.flowre.server.domain.auth.service;

import com.flowre.server.domain.auth.dto.LoginRequest;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import com.flowre.server.global.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.RedisConnectionFailureException;
import java.util.concurrent.TimeUnit;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserRepository userRepository;
    private StoreRepository storeRepository;
    private JwtUtil jwtUtil;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;
    private RedisTemplate<String, String> redisTemplate;
    private ValueOperations<String, String> values;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        storeRepository = mock(StoreRepository.class);
        jwtUtil = mock(JwtUtil.class);
        passwordEncoder = mock(PasswordEncoder.class);
        redisTemplate = mock(RedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(values);
        authService = new AuthService(userRepository, storeRepository, jwtUtil, passwordEncoder, redisTemplate);
    }

    @Test
    void loginSucceedsWithStoreCodeEmployeeCodeAndPassword() {
        stubSuccessfulLogin();

        AuthService.LoginResult result = authService.login(loginRequest("1001", "1001ABCD!", "Test1234!"));

        assertThat(result.response().getAccessToken()).isEqualTo("access-token");
        assertThat(result.response().getUser().getEmployeeCode()).isEqualTo("1001ABCD!");
        assertThat(result.response().getUser().getStoreCode()).isEqualTo("1001");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        verify(values).set("refresh:1", "refresh-token", 604800000L, TimeUnit.MILLISECONDS);
    }

    @Test
    void loginFailsWhenStoreCodeDoesNotMatchEmployeeCodePrefix() {
        assertThatThrownBy(() -> authService.login(loginRequest("1002", "1001ABCD!", "Test1234!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);

        verify(userRepository, never()).findByEmployeeCode(anyString());
    }

    @Test
    void loginFailsWhenEmployeeCodeFormatIsInvalid() {
        assertThatThrownBy(() -> authService.login(loginRequest("1001", "1001ABC", "Test1234!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    void loginFailsWhenPasswordIsWrong() {
        User user = user("1001", "1001ABCD!");
        when(userRepository.findByEmployeeCode("1001ABCD!")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(loginRequest("1001", "1001ABCD!", "wrong")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    void loginFailsWhenStoreIsNotRegistered() {
        User user = user("1001", "1001ABCD!");
        when(userRepository.findByEmployeeCode("1001ABCD!")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Test1234!", user.getPassword())).thenReturn(true);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(loginRequest("1001", "1001ABCD!", "Test1234!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    void loginFailsWhenAccountIsPendingApproval() {
        User user = user("1001", "1001ABCD!");
        ReflectionTestUtils.setField(user, "status", com.flowre.server.domain.user.entity.UserStatus.PENDING);
        when(userRepository.findByEmployeeCode("1001ABCD!")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Test1234!", user.getPassword())).thenReturn(true);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store("1001")));

        assertThatThrownBy(() -> authService.login(loginRequest("1001", "1001ABCD!", "Test1234!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCOUNT_PENDING_APPROVAL);
    }

    @Test
    void loginFailsWhenAccountIsRejected() {
        User user = user("1001", "1001ABCD!");
        ReflectionTestUtils.setField(user, "status", com.flowre.server.domain.user.entity.UserStatus.REJECTED);
        when(userRepository.findByEmployeeCode("1001ABCD!")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Test1234!", user.getPassword())).thenReturn(true);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store("1001")));

        assertThatThrownBy(() -> authService.login(loginRequest("1001", "1001ABCD!", "Test1234!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCOUNT_REJECTED);
    }

    @Test
    void refreshRejectsNonRefreshToken() {
        when(jwtUtil.isRefreshToken("access-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh("access-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_TOKEN);

        verify(jwtUtil, never()).getUserId(anyString());
    }

    @Test
    void loginFailsWhenRedisCannotSaveToken() {
        doThrow(new RedisConnectionFailureException("unavailable"))
                .when(values).set("refresh:1", "refresh-token", 604800000L, TimeUnit.MILLISECONDS);
        stubSuccessfulLogin();
        assertThatThrownBy(() -> authService.login(loginRequest("1001", "1001ABCD!", "Test1234!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.AUTH_STORAGE_UNAVAILABLE);
    }

    @Test
    void refreshFailsDuringOutageAndSucceedsAfterRecovery() {
        when(jwtUtil.isRefreshToken("refresh-token")).thenReturn(true);
        when(jwtUtil.getUserId("refresh-token")).thenReturn(1L);
        when(values.get("refresh:1"))
                .thenThrow(new RedisConnectionFailureException("unavailable"))
                .thenReturn("refresh-token");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user("1001", "1001ABCD!")));
        when(jwtUtil.generateAccessToken(1L, "manager@flowre.com", "STORE_MANAGER")).thenReturn("new-access");
        assertThatThrownBy(() -> authService.refresh("refresh-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.AUTH_STORAGE_UNAVAILABLE);
        assertThat(authService.refresh("refresh-token")).isEqualTo("new-access");
    }

    @Test
    void refreshRejectsMissingOrExpiredToken() {
        when(jwtUtil.isRefreshToken("refresh-token")).thenReturn(true);
        when(jwtUtil.getUserId("refresh-token")).thenReturn(1L);
        assertThatThrownBy(() -> authService.refresh("refresh-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        verify(userRepository, never()).findById(1L);
    }

    @Test
    void logoutDeletesTokenAndReportsRedisFailure() {
        when(redisTemplate.delete("refresh:1")).thenReturn(true)
                .thenThrow(new RedisConnectionFailureException("unavailable"));
        authService.logout(1L);
        assertThatThrownBy(() -> authService.logout(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.AUTH_STORAGE_UNAVAILABLE);
        verify(redisTemplate, times(2)).delete("refresh:1");
    }

    private void stubSuccessfulLogin() {
        User user = user("1001", "1001ABCD!");
        when(userRepository.findByEmployeeCode("1001ABCD!")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Test1234!", user.getPassword())).thenReturn(true);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store("1001")));
        when(jwtUtil.generateAccessToken(1L, "manager@flowre.com", "STORE_MANAGER")).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(1L)).thenReturn("refresh-token");
        when(jwtUtil.getRefreshExpirationMs()).thenReturn(604800000L);

    }

    private LoginRequest loginRequest(String storeCode, String employeeCode, String password) {
        LoginRequest request = new LoginRequest();
        ReflectionTestUtils.setField(request, "storeCode", storeCode);
        ReflectionTestUtils.setField(request, "employeeCode", employeeCode);
        ReflectionTestUtils.setField(request, "password", password);
        return request;
    }

    private User user(String storeCode, String employeeCode) {
        return User.builder()
                .id(1L)
                .email("manager@flowre.com")
                .employeeCode(employeeCode)
                .password("encoded-password")
                .name("테스트 점장")
                .role(UserRole.STORE_MANAGER)
                .brandId(1L)
                .storeId(Long.valueOf(storeCode))
                .storeCode(storeCode)
                .storeName("강남점")
                .build();
    }

    private Store store(String storeCode) {
        return Store.builder()
                .id(1L)
                .brandId(1L)
                .storeCode(storeCode)
                .storeName("강남점")
                .active(true)
                .build();
    }
}
