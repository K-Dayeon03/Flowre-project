package com.flowre.server.global.util;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private final JwtUtil jwtUtil = new JwtUtil(
            "flowre-test-secret-key-must-be-at-least-256-bits-long",
            1_800_000L,
            604_800_000L
    );

    @Test
    void accessTokenHasAccessTypeOnly() {
        String token = jwtUtil.generateAccessToken(1L, "manager@flowre.com", "STORE_MANAGER");

        Claims claims = jwtUtil.parseClaims(token);

        assertThat(claims.get("type", String.class)).isEqualTo("access");
        assertThat(jwtUtil.isAccessToken(token)).isTrue();
        assertThat(jwtUtil.isRefreshToken(token)).isFalse();
    }

    @Test
    void refreshTokenHasRefreshTypeOnly() {
        String token = jwtUtil.generateRefreshToken(1L);

        Claims claims = jwtUtil.parseClaims(token);

        assertThat(claims.get("type", String.class)).isEqualTo("refresh");
        assertThat(jwtUtil.isRefreshToken(token)).isTrue();
        assertThat(jwtUtil.isAccessToken(token)).isFalse();
    }
}
