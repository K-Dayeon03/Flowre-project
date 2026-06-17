---
name: seed-accounts
description: Flowre 로그인용 초기 시드 계정 정보(점별 코드·직원 아이디·비밀번호)를 알려준다. "로그인 정보 알려줘", "초기 계정", "시드 계정", "테스트 계정", "관리자 계정 뭐였지", "어떤 계정으로 로그인해?" 같이 로그인에 쓸 계정/코드를 물을 때 사용.
---

# Flowre 초기 시드 계정 안내

이 스킬은 Flowre 백엔드가 부팅 시 자동 생성하는 **로그인용 초기 계정**의
점별 코드·직원 아이디·비밀번호를 알려준다. 값을 이 문서에 하드코딩하지 말고,
**항상 아래 출처에서 직접 읽어서** 보고한다 (설정·DB가 바뀌어도 안 낡도록).

## 1. 부트스트랩 ADMIN 계정 (항상 존재)

`AdminAccountInitializer`가 `flowre.admin.*` 설정값으로 생성한다.
값을 `server/src/main/resources/application.yml`의 `flowre.admin:` 블록에서 읽어 보고한다.

```bash
sed -n '/^flowre:/,/^[a-z]/p' server/src/main/resources/application.yml | grep -A12 'admin:'
```

- 보고 항목: **점별 코드**(`store-code`), **직원 아이디**(`employee-code`), **비밀번호**(`password`), 이메일, 이름, 권한(ADMIN)
- 각 값은 `${ENV_VAR:기본값}` 형태다. **환경변수가 설정돼 있으면 그 값이 우선**이므로,
  실행 중인 서버 기준으로 확인하려면 아래 환경변수도 함께 점검해 보고한다:
  `FLOWRE_ADMIN_STORE_CODE`, `FLOWRE_ADMIN_EMPLOYEE_CODE`, `FLOWRE_ADMIN_PASSWORD`
  ```bash
  for v in FLOWRE_ADMIN_STORE_CODE FLOWRE_ADMIN_EMPLOYEE_CODE FLOWRE_ADMIN_PASSWORD; do
    printf "%s=%s\n" "$v" "${!v:-(미설정 → application.yml 기본값 사용)}"; done
  ```

## 2. 개발용 시드 매장 (계정 아님)

`DataInitializer`(`@Profile("!prod")`)가 개발 환경에서 매장 `1001 강남점`과 재고 샘플을 만든다.
이 매장에는 **직원 계정이 없다** — 일반 직원 계정은 본사(ADMIN/HQ)가 앱에서 직접 발급한다.
참고로만 함께 안내한다. 값은 `DataInitializer.java`에서 확인한다.

## 3. (선택) 실제 DB에 존재하는 계정 조회

서버/DB가 떠 있고 HQ가 추가로 발급한 계정까지 알고 싶다면, 라이브 DB에서 조회한다.
**비밀번호는 BCrypt 해시로 저장**되므로 평문은 알 수 없다(부트스트랩 ADMIN만 설정값으로 평문 확인 가능).
DB 접속값은 `application.yml`의 `spring.datasource`에서 읽는다(기본 `root`/`1234`/`flowre`).

```bash
mysql -h127.0.0.1 -uroot -p1234 flowre \
  -e "SELECT store_code AS 점별코드, employee_code AS 직원아이디, name AS 이름, role AS 권한, status AS 상태 FROM users ORDER BY id;" 2>/dev/null \
  || echo "(DB 미기동 — 서버를 먼저 띄우면 조회 가능)"
```

## 보고 형식

수집한 값을 아래처럼 표로 정리해 사용자에게 보여준다. 비밀번호가 기본값이면
"운영에선 환경변수로 변경 권장"을 한 줄 덧붙인다.

| 구분 | 점별 코드 | 직원 아이디 | 비밀번호 | 권한 |
|------|-----------|-------------|----------|------|
| 관리자(부트스트랩) | … | … | … | ADMIN |

마지막에 로그인 화면 주소(웹 실행 중이면 http://localhost:8081 등)도 함께 안내하면 친절하다.
