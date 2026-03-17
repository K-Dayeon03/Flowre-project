package com.flowre.server.global.config;

import org.springframework.context.annotation.Configuration;

/**
 * S3 더미 설정 — AWS 연동 전 로컬 개발용
 * 실제 S3 사용 시 아래 주석을 해제하고 build.gradle에서 AWS SDK 의존성을 활성화하세요.
 */
@Configuration
public class S3Config {
    // TODO: AWS S3 연동 시 S3Client / S3Presigner 빈 등록
}
