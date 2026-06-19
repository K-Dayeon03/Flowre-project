package com.flowre.server.domain.auth.controller;

import com.flowre.server.domain.auth.dto.LoginRequest;
import com.flowre.server.domain.auth.dto.LoginResponse;
import com.flowre.server.domain.auth.service.AuthService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.response.ApiResponse;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    private AuthService authService;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        authController = new AuthController(authService);
    }

    @Test
    void loginStoresRefreshTokenInHttpOnlyCookie() {
        User user = user();
        LoginRequest request = mock(LoginRequest.class);
        LoginResponse loginResponse = LoginResponse.of("access-token", user);
        when(authService.login(request)).thenReturn(new AuthService.LoginResult(loginResponse, "refresh-token"));
        MockHttpServletResponse servletResponse = new MockHttpServletResponse();

        ResponseEntity<ApiResponse<LoginResponse>> response = authController.login(request, servletResponse);

        Cookie cookie = servletResponse.getCookie("refresh_token");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("refresh-token");
        assertThat(cookie.getValue()).isNotEqualTo(response.getBody().getData().getAccessToken());
        assertThat(cookie.isHttpOnly()).isTrue();
    }

    @Test
    void meReturnsEmployeeCodeAndStoreCode() {
        ResponseEntity<ApiResponse<LoginResponse.UserInfo>> response = authController.me(user());

        assertThat(response.getBody().getData().getEmployeeCode()).isEqualTo("1001ABCD!");
        assertThat(response.getBody().getData().getStoreCode()).isEqualTo("1001");
    }

    private User user() {
        return User.builder()
                .id(1L)
                .email("manager@flowre.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("테스트 점장")
                .role(UserRole.STORE_MANAGER)
                .brandId(1L)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
