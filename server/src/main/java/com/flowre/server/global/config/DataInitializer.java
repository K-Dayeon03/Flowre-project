package com.flowre.server.global.config;

import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User manager = User.builder()
                    .email("manager@jaju.com")
                    .password(passwordEncoder.encode("Test1234!"))
                    .name("테스트 점장")
                    .role(UserRole.STORE_MANAGER)
                    .brandId(1L)
                    .storeId(1L)
                    .storeName("JAJU 강남점")
                    .build();

            User staff = User.builder()
                    .email("staff@jaju.com")
                    .password(passwordEncoder.encode("Test1234!"))
                    .name("테스트 직원")
                    .role(UserRole.STORE_STAFF)
                    .brandId(1L)
                    .storeId(1L)
                    .storeName("JAJU 강남점")
                    .build();

            userRepository.save(manager);
            userRepository.save(staff);
            log.info("[DataInitializer] 테스트 유저 2명 생성 완료 — manager@jaju.com / staff@jaju.com (pw: Test1234!)");
        }
    }
}
