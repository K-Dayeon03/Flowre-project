package com.flowre.server.domain.auth.filter;

import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.entity.UserStatus;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    private JwtUtil jwtUtil;
    private UserRepository userRepository;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        jwtUtil = mock(JwtUtil.class);
        userRepository = mock(UserRepository.class);
        filter = new JwtAuthenticationFilter(jwtUtil, userRepository);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void setsAuthenticationForActiveUser() throws Exception {
        HttpServletRequest request = requestWithToken("valid-token");
        when(jwtUtil.isAccessToken("valid-token")).thenReturn(true);
        when(jwtUtil.getUserId("valid-token")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(UserStatus.ACTIVE)));

        filter.doFilter(request, mock(HttpServletResponse.class), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void doesNotAuthenticateRejectedUserWithValidToken() throws Exception {
        // 토큰은 유효하지만 거절(REJECTED)된 계정 → 인증 컨텍스트가 설정되면 안 된다.
        HttpServletRequest request = requestWithToken("valid-token");
        when(jwtUtil.isAccessToken("valid-token")).thenReturn(true);
        when(jwtUtil.getUserId("valid-token")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(UserStatus.REJECTED)));

        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, mock(HttpServletResponse.class), chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any()); // 체인은 계속 진행되되 인증만 비어 anyRequest().authenticated()에서 차단
    }

    @Test
    void doesNotAuthenticatePendingUserWithValidToken() throws Exception {
        HttpServletRequest request = requestWithToken("valid-token");
        when(jwtUtil.isAccessToken("valid-token")).thenReturn(true);
        when(jwtUtil.getUserId("valid-token")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(UserStatus.PENDING)));

        filter.doFilter(request, mock(HttpServletResponse.class), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private HttpServletRequest requestWithToken(String token) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        return request;
    }

    private User user(UserStatus status) {
        return User.builder()
                .id(1L)
                .email("user@flowre.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("테스트 사용자")
                .role(UserRole.STORE_STAFF)
                .status(status)
                .brandId(1L)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
