package com.flowre.server.domain.auth.filter;

import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    //필터가 요청 처리 흐름을 담당하고, JwtUtil이 토큰 검증을 담당하는 구조
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    //LoginRequest와는 다르다. 헤더 등을 읽을 수 있는 Http요청 객체이다. 요쳥에서 문자열만 꺼낸 단계
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = resolveToken(request); //사용자가 로그인 후 API를 호출하면 요청 헤더에  Authorization:Bearer abc.def.ghi 형식으로 들어온다

        if (StringUtils.hasText(token) && jwtUtil.isAccessToken(token)) {
            try {
                Long userId = jwtUtil.getUserId(token);
                User user = userRepository.findById(userId).orElse(null);

                // 토큰이 유효해도 비활성(PENDING/REJECTED) 계정은 인증 컨텍스트를 설정하지 않는다.
                // 토큰 발급 후 점장이 거절·비활성화한 직원이 남은 토큰으로 접근하는 것을 차단.
                if (user != null && user.isActive()) {
                    var authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
                    var authentication = new UsernamePasswordAuthenticationToken(
                            user, null, List.of(authority));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                log.warn("[JWT Filter] 인증 실패: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
    //토큰이 유효한 Access Token인지 확인하는 부분
    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        //토큰 문자열이 있는지, 유효한 토큰인지
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
