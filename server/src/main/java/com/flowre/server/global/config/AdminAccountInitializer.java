package com.flowre.server.global.config;

import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 부트스트랩 관리자 계정 초기화기.
 *
 * 직원 계정은 본사(HQ/ADMIN)가 직접 발급하므로, 시스템 최초 기동 시 본사 로그인을 위한
 * 단일 관리자(ADMIN) 계정이 필요하다. 이 계정은 하드코딩하지 않고 설정값(환경변수 오버라이드 가능)으로
 * 주입하며, 동일한 직원 아이디 계정이 이미 존재하면 아무것도 하지 않는다.
 *
 * 운영 환경에서는 반드시 {@code FLOWRE_ADMIN_PASSWORD} 등 환경변수로 기본값을 덮어쓸 것.
 * 부트스트랩이 끝난 뒤에는 {@code flowre.admin.enabled=false}로 비활성화할 수 있다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${flowre.admin.enabled:true}")
    private boolean enabled;

    @Value("${flowre.admin.brand-id:1}")
    private Long brandId;

    @Value("${flowre.admin.store-code:0000}")
    private String storeCode;

    @Value("${flowre.admin.store-name:Flowre 운영 본부}")
    private String storeName;

    @Value("${flowre.admin.employee-code:0000ADMN!}")
    private String employeeCode;

    @Value("${flowre.admin.email:admin@flowre.local}")
    private String email;

    @Value("${flowre.admin.name:시스템 관리자}")
    private String name;

    @Value("${flowre.admin.password:flowre-admin-1234!}")
    private String password;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        if (userRepository.existsByEmployeeCode(employeeCode)) {
            return;
        }

        // 관리자 로그인에는 활성 상태의 소속 매장이 필요하므로 없으면 함께 생성한다.
        Store store = storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(brandId, storeCode)
                .orElseGet(() -> storeRepository.save(Store.builder()
                        .brandId(brandId)
                        .storeCode(storeCode)
                        .storeName(storeName)
                        .active(true)
                        .build()));

        userRepository.save(User.builder()
                .email(email)
                .employeeCode(employeeCode)
                .password(passwordEncoder.encode(password))
                .name(name)
                .role(UserRole.ADMIN)
                .brandId(brandId)
                .storeId(store.getId())
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .build());

        log.info("[AdminAccountInitializer] 부트스트랩 관리자 계정 생성 — storeCode={}, employeeCode={} "
                + "(운영 환경에서는 즉시 비밀번호를 변경/재발급하세요)", storeCode, employeeCode);
    }
}
