package com.flowre.server.domain.inventory.dto;

import com.flowre.server.domain.inventory.entity.InventoryTransaction;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class InventoryTransactionResponse {

    private Long id;
    private Long inventoryItemId;
    private Long storeId;
    private String productCode;
    private String productName;
    private Integer quantity;
    private Integer remainingQuantity;
    private String reason;
    private String usedByName;
    private LocalDateTime createdAt;

    /** 엔티티를 본사 재고 사용 이력 응답으로 변환합니다. */
    public static InventoryTransactionResponse from(InventoryTransaction transaction) {
        return InventoryTransactionResponse.builder()
                .id(transaction.getId())
                .inventoryItemId(transaction.getInventoryItemId())
                .storeId(transaction.getStoreId())
                .productCode(transaction.getProductCode())
                .productName(transaction.getProductName())
                .quantity(transaction.getQuantity())
                .remainingQuantity(transaction.getRemainingQuantity())
                .reason(transaction.getReason())
                .usedByName(transaction.getUsedByName())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
