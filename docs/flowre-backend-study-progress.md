# Flowre 백엔드 학습 진도

기록일: 2026-11-11
학습 방향: 백엔드만 담당하고 싶다는 사용자 요청을 반영한다.

## 지금까지 다룬 내용

- `AuthController.login`과 `@RequestBody`의 JSON → `LoginRequest` 변환.
- 현재 로그인 입력 필드는 `storeCode`, `employeeCode`, `password`이다. 오래된 문서의 이메일 로그인 설명을 그대로 따르지 않는다.
- `AuthService.login`의 사용자 조회, 비밀번호 비교, 매장·브랜드·활성 여부 및 승인 상태 확인.
- `storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(...)`의 파생 쿼리와 `orElseThrow`.
- Access / Refresh Token의 역할, Refresh Token 저장, Access Token을 저장하지 않고 검증하는 이유.
- 로그아웃 후에도 별도 폐기 처리가 없다면 발급된 Access Token은 만료 전까지 사용할 수 있다는 개념.
- Redis 연결과 인증 저장소 개선을 요청받아 다룸.

사용자는 앞선 메서드 및 Repository 설명에서 “이해했어”라고 응답했다. 모든 토큰·Redis 세부 사항까지 이해 완료한 것으로 처리하지 않는다.

## 다음 학습 지점

로그인 이후 인증이 필요한 요청을 서버가 처리하는 흐름.

첫 파일:
`server/src/main/java/com/flowre/server/domain/auth/filter/JwtAuthenticationFilter.java`

첫 단계는 `doFilterInternal`의 `String token = resolveToken(request);`와 `resolveToken`이다. `Authorization: Bearer ...` 헤더에서 토큰 문자열을 꺼내는 부분까지만 먼저 설명한다.

이후 순서:
1. `JwtUtil.isAccessToken`의 실제 구현을 읽고 서명·만료·토큰 종류 검증을 설명한다.
2. 토큰에서 userId 추출 → DB 사용자 조회 → 활성 상태 확인.
3. 역할 권한과 Authentication 생성 → SecurityContext 저장.
4. filterChain을 통한 다음 처리 및 인증된 사용자 정보를 사용하는 컨트롤러.

이 흐름은 다음 수업 예정이며 학습 완료로 기록하지 않는다.

## 실행 상태와 재확인 사항

이전 작업 기록 기준이며 다음 세션에서 현재 파일과 실행 환경을 재확인한다.

- AuthService의 메모리 Refresh Token 대체 저장을 제거하고 Redis 장애 시 AUTH_STORAGE_UNAVAILABLE 오류를 반환하도록 개선했다.
- Redis 연결·명령 시간 제한과 환경 변수 설정을 추가했다.
- 이전 기록에서 직접 javac / JUnit 방식으로 AuthService 테스트 12개가 통과했다. 이번 문서 저장 시 재실행하지 않았다.
- redis-cli PING과 임시 키 저장·조회·만료·삭제는 확인했지만, Spring 애플리케이션에서 Redis까지 실제 연결하는 검증은 실행 환경의 Java 소켓 제한으로 완료하지 못했다.
- 로컬 Redis의 이전 실행 주소는 127.0.0.1:6379였다. 계속 실행 중이거나 재부팅 후 자동 시작된다고 가정하지 않는다.
- Gradle 실행은 캐시 잠금 및 데몬 소켓 권한 문제로 막힌 기록이 있다. 전체 Gradle 테스트 통과로 표현하지 않는다.
- `.run/Flowre_Local.run.xml`의 local 프로필 실행 구성을 추가했지만 실제 Spring 서버 기동 성공은 확인하지 못했다.
- 작업 트리에 사용자 및 다른 작업의 변경 사항이 다수 있으므로 관련 없는 변경을 되돌리지 않는다.
