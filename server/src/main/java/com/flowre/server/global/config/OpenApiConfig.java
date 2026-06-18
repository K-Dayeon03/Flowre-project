package com.flowre.server.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI / OpenAPI 3 문서 설정.
 *
 * JWT Bearer 인증 스킴을 등록해, Swagger UI의 "Authorize"에 Access Token을 입력하면
 * 모든 보호된 API를 인증된 상태로 호출해볼 수 있다. 문서는 /swagger-ui.html 에서 확인한다.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI flowreOpenAPI() {
        SecurityScheme bearerScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("로그인 후 발급된 Access Token을 'Bearer ' 없이 입력하세요.");

        return new OpenAPI()
                .info(new Info()
                        .title("Flowre API")
                        .description("신세계까사 JAJU 매장 직원 통합 업무 관리 앱 백엔드 API")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME, bearerScheme));
    }
}
