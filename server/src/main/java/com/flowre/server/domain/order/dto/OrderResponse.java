package com.flowre.server.domain.order.dto;

import com.flowre.server.domain.order.entity.InventoryOrder;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class OrderResponse {

    private Long id;
    private Long storeId;
    private String storeName;
    private Long inventoryItemId;
    private String productCode;
    private String productName;
    private Integer currentQuantity;
    private Integer minQuantity;
    private Integer orderQuantity;
    private Integer unitPrice;
    private Integer expectedAmount;
    private String status;
    private Long requestedById;
    private String requestedByName;
    private String canceledReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 엔티티를 발주 응답으로 변환합니다. */
    public static OrderResponse from(InventoryOrder order) {
        return OrderResponse.builder()
                .id(order.getId())
                .storeId(order.getStoreId())
                .storeName(order.getStoreName())
                .inventoryItemId(order.getInventoryItemId())
                .productCode(order.getProductCode())
                .productName(order.getProductName())
                .currentQuantity(order.getCurrentQuantity())
                .minQuantity(order.getMinQuantity())
                .orderQuantity(order.getOrderQuantity())
                .unitPrice(order.getUnitPrice())
                .expectedAmount(order.getExpectedAmount())
                .status(order.getStatus().name())
                .requestedById(order.getRequestedById())
                .requestedByName(order.getRequestedByName())
                .canceledReason(order.getCanceledReason())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}

