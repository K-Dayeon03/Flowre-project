package com.flowre.server.global.config;

import com.flowre.server.domain.inventory.dto.InventoryLoadResponse;
import com.flowre.server.domain.inventory.service.InventoryExcelLoader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryDataLoaderRunner implements CommandLineRunner {

    private final InventoryExcelLoader inventoryExcelLoader;

    @Value("${flowre.inventory.auto-load:true}")
    private boolean autoLoad;

    /** 서버 시작 시 data 폴더의 xlsx 재고 파일을 DB에 반영합니다. */
    @Override
    public void run(String... args) {
        if (!autoLoad) {
            log.info("[InventoryDataLoaderRunner] inventory auto-load disabled");
            return;
        }

        InventoryLoadResponse response = inventoryExcelLoader.loadFromDataDirectory();
        log.info(
                "[InventoryDataLoaderRunner] files={}, rows={}, created={}, updated={}, skipped={}",
                response.getFileCount(),
                response.getRowCount(),
                response.getCreatedCount(),
                response.getUpdatedCount(),
                response.getSkippedCount()
        );
    }
}
