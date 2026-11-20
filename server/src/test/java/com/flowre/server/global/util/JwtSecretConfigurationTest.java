package com.flowre.server.global.util;

import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtSecretConfigurationTest {

    @Import({JwtUtil.class, PropertySourcesPlaceholderConfigurer.class})
    static class JwtConfiguration {}

    /** 실제 설정 파일을 읽되 개발 머신의 환경변수와 시스템 속성을 격리한다. */
    private ConfigurableApplicationContext start(String profile, String... args) {
        var environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.setActiveProfiles(profile);
        return new SpringApplicationBuilder(JwtConfiguration.class)
                .environment(environment)
                .web(WebApplicationType.NONE)
                .registerShutdownHook(false)
                .run(args);
    }

    /** 운영 키가 누락되면 빈 초기화가 실패한다. */
    @Test
    void productionRequiresAnExplicitKey() {
        assertThatThrownBy(() -> start("prod")).hasStackTraceContaining("JWT_SECRET");
    }

    /** 공백만으로 구성된 운영 키도 거부한다. */
    @Test
    void rejectsBlankKey() {
        assertThatThrownBy(() -> start("prod", "--JWT_SECRET=" + " ".repeat(32)))
                .hasRootCauseMessage("JWT 서명 키가 비어 있습니다.");
    }

    /** 주입받은 운영 키로 토큰을 발급하고 검증한다. */
    @Test
    void productionUsesConfiguredKey() {
        try (var context = start("prod", "--JWT_SECRET=" + "x".repeat(32))) {
            JwtUtil jwt = context.getBean(JwtUtil.class);
            assertThat(jwt.isRefreshToken(jwt.generateRefreshToken(1L))).isTrue();
        }
    }

    /** 로컬 프로필은 임시 키로 토큰을 발급한다. */
    @Test
    void localStartsWithTemporaryKey() {
        try (var context = start("local")) {
            JwtUtil jwt = context.getBean(JwtUtil.class);
            assertThat(jwt.isRefreshToken(jwt.generateRefreshToken(1L))).isTrue();
        }
    }
}
