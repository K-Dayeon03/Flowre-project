package com.flowre.server.domain.inventory.entity;

import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "inventory_items",
        indexes = {
                @Index(name = "idx_inventory_brand_store", columnList = "brand_id, store_id"),
                @Index(name = "idx_inventory_search", columnList = "brand_id, product_code, barcode")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private String storeCode;

    @Column(nullable = false)
    private String storeName;

    @Column(nullable = false)
    private String productCode;

    private String colorCode;

    private String colorName;

    private String sizeName;

    @Column(nullable = false)
    private String productName;

    private String barcode;

    private String sourceCode;

    private Integer packQuantity;

    private Integer normalPrice;

    private Integer retailPrice;

    @Column(nullable = false)
    private Integer quantity;

    @Builder.Default
    @Column(nullable = false)
    private boolean archived = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "archive_label_id")
    private InventoryLabel archiveLabel;

    private LocalDateTime archivedAt;

    private String archivedBy;

    private String archiveItemName;

    private Integer archiveQuantity;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** 재고 항목을 사용자가 지정한 라벨로 아카이브 처리합니다. */
    public void archive(InventoryLabel label, String userName, String archiveItemName, Integer archiveQuantity) {
        this.archived = true;
        this.archiveLabel = label;
        this.archiveItemName = archiveItemName;
        this.archiveQuantity = archiveQuantity;
        this.archivedAt = LocalDateTime.now();
        this.archivedBy = userName;
    }

    /** 재고 항목을 활성 목록으로 되돌립니다. */
    public void unarchive() {
        this.archived = false;
        this.archiveLabel = null;
        this.archiveItemName = null;
        this.archiveQuantity = null;
        this.archivedAt = null;
        this.archivedBy = null;
    }

    /** 엑셀 로더에서 읽은 최신 재고 값으로 항목을 갱신합니다. */
    public void updateFromLoader(String storeName, String productName, String colorName, String sourceCode,
                                 Integer packQuantity, Integer normalPrice, Integer retailPrice, Integer quantity) {
        this.storeName = storeName;
        this.productName = productName;
        this.colorName = colorName;
        this.sourceCode = sourceCode;
        this.packQuantity = packQuantity;
        this.normalPrice = normalPrice;
        this.retailPrice = retailPrice;
        this.quantity = quantity;
    }

    /** 본사 사용분을 전산 재고에서 차감합니다. */
    public void deduct(int amount) {
        if (amount <= 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (quantity < amount) {
            throw new CustomException(ErrorCode.INVENTORY_NOT_ENOUGH);
        }
        this.quantity -= amount;
    }

    /** 실시간 재고 수량을 증감합니다. */
    public void adjust(int amount) {
        if (amount == 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        int nextQuantity = this.quantity + amount;
        if (nextQuantity < 0) {
            throw new CustomException(ErrorCode.INVENTORY_NOT_ENOUGH);
        }
        this.quantity = nextQuantity;
    }
}
