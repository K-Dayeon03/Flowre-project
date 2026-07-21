package com.flowre.server.global.config;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryLabel;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.entity.UserStatus;
import com.flowre.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final StoreRepository storeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryLabelRepository inventoryLabelRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!storeRepository.existsByBrandIdAndStoreCode(1L, "1001")) {
            storeRepository.save(Store.builder()
                    .brandId(1L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .latitude(37.4979)
                    .longitude(127.0276)
                    .active(true)
                    .build());
            log.info("[DataInitializer] 개발용 매장 생성 완료 — 1001 강남점");
        } else {
            storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001")
                    .ifPresent(store -> {
                        store.updateCoordinates(37.4979, 127.0276);
                        storeRepository.save(store);
                    });
        }

        Optional<Store> headquartersStore = storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "0000");
        headquartersStore.ifPresent(store -> {
            store.updateCoordinates(37.5007, 127.0365);
            storeRepository.save(store);
        });

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

        createDevAccounts();
    }

    /** 개발용 시드 계정을 생성합니다. 이미 존재하는 계정은 건너뜁니다. */
    private void createDevAccounts() {
        // 본부(0000) HQ_STAFF — ADMIN이 채팅 상대로 선택 가능
        storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "0000").ifPresent(hqStore -> {
            if (!userRepository.existsByEmployeeCode("0000HQST!")) {
                userRepository.save(User.builder()
                        .email("hqstaff@flowre.local")
                        .employeeCode("0000HQST!")
                        .password(passwordEncoder.encode("Test1234!"))
                        .name("본사 직원")
                        .role(UserRole.HQ_STAFF)
                        .status(UserStatus.ACTIVE)
                        .brandId(1L)
                        .storeId(hqStore.getId())
                        .storeCode(hqStore.getStoreCode())
                        .storeName(hqStore.getStoreName())
                        .build());
                log.info("[DataInitializer] 개발용 HQ_STAFF 계정 생성 — 0000HQST!");
            }
        });

        // 강남점(1001) 점장 — 채팅·스케줄 테스트용
        storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001").ifPresent(store -> {
            if (!userRepository.existsByEmployeeCode("1001ABCD!")) {
                userRepository.save(User.builder()
                        .email("manager@flowre.local")
                        .employeeCode("1001ABCD!")
                        .password(passwordEncoder.encode("Test1234!"))
                        .name("강남점 점장")
                        .role(UserRole.STORE_MANAGER)
                        .status(UserStatus.ACTIVE)
                        .brandId(1L)
                        .storeId(store.getId())
                        .storeCode(store.getStoreCode())
                        .storeName(store.getStoreName())
                        .build());
                log.info("[DataInitializer] 개발용 STORE_MANAGER 계정 생성 — 1001ABCD!");
            }

            if (!userRepository.existsByEmployeeCode("1001QWER!")) {
                userRepository.save(User.builder()
                        .email("staff@flowre.local")
                        .employeeCode("1001QWER!")
                        .password(passwordEncoder.encode("Test1234!"))
                        .name("강다연")
                        .role(UserRole.STORE_STAFF)
                        .status(UserStatus.ACTIVE)
                        .brandId(1L)
                        .storeId(store.getId())
                        .storeCode(store.getStoreCode())
                        .storeName(store.getStoreName())
                        .build());
                log.info("[DataInitializer] 개발용 STORE_STAFF 계정 생성 — 1001QWER!");
            }
        });
    }
}
