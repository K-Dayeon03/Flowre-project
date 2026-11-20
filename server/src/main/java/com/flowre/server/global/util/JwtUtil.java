package com.flowre.server.global.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtUtil {
    //필터가 요청 처리 흐름을 담당하고, JwtUtil이 토큰 검증을 담당하는 구조
    private final SecretKey secretKey;
    private final long accessExpiration;
    private final long refreshExpiration;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiration}") long accessExpiration,
            @Value("${jwt.refresh-expiration}") long refreshExpiration
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }

    public String generateAccessToken(Long userId, String email, String role) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", "access")
                .claim("email", email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpiration))
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(Long userId) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpiration))
                .signWith(secretKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserId(String token) {
        return Long.parseLong(parseClaims(token).getSubject());
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("[JWT] 만료된 토큰");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[JWT] 유효하지 않은 토큰: {}", e.getMessage());
        }
        return false;
    }

    /**
     * 인증에 사용할 수 있는 Access Token인지 검증합니다.
     */
    public boolean isAccessToken(String token) {
        return hasTokenType(token, "access");
    }

    /**
     * 토큰 갱신에 사용할 수 있는 Refresh Token인지 검증합니다.
     */
    public boolean isRefreshToken(String token) {
        return hasTokenType(token, "refresh");
    }

    private boolean hasTokenType(String token, String expectedType) {
        try {
            //토큰을 검즈하고 안에 담긴 정보를 가져온다
            //parseClaims는 서버의 키로 서명을 검증, 만료 여부도 확인한다.
            Claims claims = parseClaims(token);
            return expectedType.equals(claims.get("type", String.class));
        } catch (ExpiredJwtException e) {
            log.warn("[JWT] 만료된 토큰");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[JWT] 유효하지 않은 토큰: {}", e.getMessage());
        }
        return false;
    }

    public long getRefreshExpirationMs() {
        return refreshExpiration;
    }
}
