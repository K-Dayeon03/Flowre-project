package com.flowre.server.global.config;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryLabel;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final List<String> LEGACY_DEV_EMPLOYEE_CODES = List.of(
            "0000HQST!",
            "1001ABCD!",
            "1001QWER!"
    );

    private final StoreRepository storeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryLabelRepository inventoryLabelRepository;
    private final UserRepository userRepository;

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

        removeLegacyDevAccounts();
    }

    /**
     * 시뮬레이터에서는 부트스트랩 ADMIN(0000ADMN!)만 로그인 계정으로 남긴다.
     * 기존 개발 시드 계정은 삭제하고, 참조 데이터 때문에 삭제가 막히면 로그인 불가 상태로 전환한다.
     */
    private void removeLegacyDevAccounts() {
        LEGACY_DEV_EMPLOYEE_CODES.forEach(employeeCode ->
                userRepository.findByEmployeeCode(employeeCode).ifPresent(user -> {
                    try {
                        userRepository.delete(user);
                        log.info("[DataInitializer] 개발용 시드 계정 삭제 — {}", employeeCode);
                    } catch (RuntimeException e) {
                        user.deactivate();
                        userRepository.save(user);
                        log.warn("[DataInitializer] 개발용 시드 계정 삭제 실패, 로그인 불가 처리 — {}", employeeCode);
                    }
                })
        );
    }
}
