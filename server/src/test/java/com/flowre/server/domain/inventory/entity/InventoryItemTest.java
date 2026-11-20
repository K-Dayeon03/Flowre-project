package com.flowre.server.domain.inventory.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InventoryItemTest {

    @Test
    void stockStatusIsOutOfStockWhenQuantityIsZero() {
        InventoryItem item = item(0, 5);

        assertThat(item.getStockStatus()).isEqualTo(StockStatus.OUT_OF_STOCK);
    }

    @Test
    void stockStatusIsLowWhenQuantityIsBelowMinimum() {
        InventoryItem item = item(4, 5);

        assertThat(item.getStockStatus()).isEqualTo(StockStatus.LOW);
    }

    @Test
    void stockStatusIsSufficientWhenQuantityMeetsMinimum() {
        InventoryItem item = item(5, 5);

        assertThat(item.getStockStatus()).isEqualTo(StockStatus.SUFFICIENT);
    }

    private InventoryItem item(int quantity, int minQuantity) {
        return InventoryItem.builder()
                .brandId(1L)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .productCode("SKU-001")
                .productName("테스트 상품")
                .quantity(quantity)
                .minQuantity(minQuantity)
                .build();
    }
}

