package com.flowre.server.global.config;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryLabel;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
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
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryLabelRepository inventoryLabelRepository;

    @Override
    public void run(String... args) {
        if (storeRepository.count() == 0) {
            storeRepository.save(Store.builder()
                    .brandId(1L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .active(true)
                    .build());
            storeRepository.save(Store.builder()
                    .brandId(1L)
                    .storeCode("0000")
                    .storeName("JAJU 본사")
                    .active(true)
                    .build());
            log.info("[DataInitializer] 테스트 매장 2개 생성 완료 — 1001 강남점 / 0000 JAJU 본사");
        }

        if (userRepository.count() == 0) {
            User manager = User.builder()
                    .email("manager@jaju.com")
                    .employeeCode("1001ABCD!")
                    .password(passwordEncoder.encode("Test1234!"))
                    .name("테스트 점장")
                    .role(UserRole.STORE_MANAGER)
                    .brandId(1L)
                    .storeId(1001L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .build();

            User staff = User.builder()
                    .email("staff@jaju.com")
                    .employeeCode("1001WXYZ!")
                    .password(passwordEncoder.encode("Test1234!"))
                    .name("테스트 직원")
                    .role(UserRole.STORE_STAFF)
                    .brandId(1L)
                    .storeId(1001L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .build();

            User hq = User.builder()
                    .email("hq@jaju.com")
                    .employeeCode("0000HQAA!")
                    .password(passwordEncoder.encode("Test1234!"))
                    .name("테스트 본사")
                    .role(UserRole.HQ_STAFF)
                    .brandId(1L)
                    .storeId(0L)
                    .storeCode("0000")
                    .storeName("JAJU 본사")
                    .build();

            userRepository.save(manager);
            userRepository.save(staff);
            userRepository.save(hq);
            log.info("[DataInitializer] 테스트 유저 3명 생성 완료 — 1001ABCD! / 1001WXYZ! / 0000HQAA! (pw: Test1234!)");
        }

        if (inventoryLabelRepository.count() == 0) {
            inventoryLabelRepository.save(InventoryLabel.builder()
                    .brandId(1L)
                    .name("추후 필요 재고")
                    .build());
        }

        if (inventoryItemRepository.count() == 0) {
            inventoryItemRepository.save(InventoryItem.builder()
                    .brandId(1L)
                    .storeId(1001L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .productCode("J1-0-4-4-01-101")
                    .colorCode("48")
                    .colorName("KHAKI")
                    .sizeName("L")
                    .productName("남녀공용 라이트 다운필 베스트")
                    .barcode("8806077980199")
                    .sourceCode("--")
                    .packQuantity(1)
                    .normalPrice(49900)
                    .retailPrice(29900)
                    .quantity(0)
                    .build());
            inventoryItemRepository.save(InventoryItem.builder()
                    .brandId(1L)
                    .storeId(1001L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .productCode("J1-0-4-4-01-102")
                    .colorCode("48")
                    .colorName("KHAKI")
                    .sizeName("M")
                    .productName("남녀공용 라이트 다운필 베스트")
                    .barcode("8806077980205")
                    .sourceCode("--")
                    .packQuantity(1)
                    .normalPrice(49900)
                    .retailPrice(29900)
                    .quantity(12)
                    .build());
            log.info("[DataInitializer] 재고 샘플 데이터 생성 완료");
        }
    }
}
