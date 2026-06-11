package com.flowre.server.global.config;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryLabel;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final StoreRepository storeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryLabelRepository inventoryLabelRepository;

    @Override
    public void run(String... args) {
        // 개발 환경 재고 샘플이 참조하는 매장만 시드한다. 실제 직원 계정은 본사가 직접 발급하며,
        // 본사 로그인용 관리자 계정은 AdminAccountInitializer가 설정값 기반으로 생성한다.
        if (!storeRepository.existsByBrandIdAndStoreCode(1L, "1001")) {
            storeRepository.save(Store.builder()
                    .brandId(1L)
                    .storeCode("1001")
                    .storeName("강남점")
                    .active(true)
                    .build());
            log.info("[DataInitializer] 개발용 매장 생성 완료 — 1001 강남점");
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
