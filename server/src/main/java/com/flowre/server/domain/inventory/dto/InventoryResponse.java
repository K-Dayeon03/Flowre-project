package com.flowre.server.domain.inventory.dto;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class InventoryResponse {

    private Long id;
    private Long version;
    private Long storeId;
    private String storeCode;
    private String storeName;
    private String productCode;
    private String colorCode;
    private String colorName;
    private String sizeName;
    private String productName;
    private String barcode;
    private String sourceCode;
    private Integer packQuantity;
    private Integer normalPrice;
    private Integer retailPrice;
    private Integer quantity;
    private boolean archived;
    private String archiveLabelName;
    private String archiveItemName;
    private String archiveItemCode;
    private Integer archiveQuantity;
    private LocalDateTime archivedAt;
    private String archivedBy;
    private LocalDateTime updatedAt;

    /** 엔티티를 재고 조회 응답으로 변환합니다. */
    public static InventoryResponse from(InventoryItem item) {
        return InventoryResponse.builder()
                .id(item.getId())
                .version(item.getVersion())
                .storeId(item.getStoreId())
                .storeCode(item.getStoreCode())
                .storeName(item.getStoreName())
                .productCode(item.getProductCode())
                .colorCode(item.getColorCode())
                .colorName(item.getColorName())
                .sizeName(item.getSizeName())
                .productName(item.getProductName())
                .barcode(item.getBarcode())
                .sourceCode(item.getSourceCode())
                .packQuantity(item.getPackQuantity())
                .normalPrice(item.getNormalPrice())
                .retailPrice(item.getRetailPrice())
                .quantity(item.getQuantity())
                .archived(item.isArchived())
                .archiveLabelName(item.getArchiveLabel() != null ? item.getArchiveLabel().getName() : null)
                .archiveItemName(item.getArchiveItemName())
                .archiveItemCode(item.getArchiveItemCode())
                .archiveQuantity(item.getArchiveQuantity())
                .archivedAt(item.getArchivedAt())
                .archivedBy(item.getArchivedBy())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
