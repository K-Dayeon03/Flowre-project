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

    private String archiveItemCode;

    private Integer archiveQuantity;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * 실시간 재고에서 분리한 수량만큼 아카이브용 신규 항목을 생성합니다.
     *
     * 원본 항목의 메타 정보(점포·상품·색상 등)를 복제하되,
     * 수량은 아카이브로 이동할 수량만 담고 사용자가 입력한 라벨·재고명·재고 코드를 부여합니다.
     *
     * @param source           분리 원본이 되는 실시간 재고 항목
     * @param label            아카이브 라벨
     * @param userName         보관 처리한 사용자명
     * @param archiveItemName  필요한 재고명
     * @param archiveItemCode  재고 코드 (선택)
     * @param archiveQuantity  아카이브로 이동할 수량
     * @return 아카이브 처리된 신규 재고 항목
     */
    public static InventoryItem createArchivedFrom(InventoryItem source, InventoryLabel label, String userName,
                                                   String archiveItemName, String archiveItemCode, int archiveQuantity) {
        return InventoryItem.builder()
                .brandId(source.brandId)
                .storeId(source.storeId)
                .storeCode(source.storeCode)
                .storeName(source.storeName)
                .productCode(source.productCode)
                .colorCode(source.colorCode)
                .colorName(source.colorName)
                .sizeName(source.sizeName)
                .productName(source.productName)
                .barcode(source.barcode)
                .sourceCode(source.sourceCode)
                .packQuantity(source.packQuantity)
                .normalPrice(source.normalPrice)
                .retailPrice(source.retailPrice)
                .quantity(archiveQuantity)
                .archived(true)
                .archiveLabel(label)
                .archiveItemName(archiveItemName)
                .archiveItemCode(archiveItemCode)
                .archiveQuantity(archiveQuantity)
                .archivedAt(LocalDateTime.now())
                .archivedBy(userName)
                .build();
    }

    /** 재고 항목을 활성 목록으로 되돌립니다. */
    public void unarchive() {
        this.archived = false;
        this.archiveLabel = null;
        this.archiveItemName = null;
        this.archiveItemCode = null;
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
