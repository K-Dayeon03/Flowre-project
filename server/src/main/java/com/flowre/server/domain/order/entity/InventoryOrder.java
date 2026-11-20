package com.flowre.server.domain.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** 재고 부족 항목에서 생성되는 매장 원격 발주입니다. */
@Entity
@Table(
        name = "inventory_orders",
        indexes = {
                @Index(name = "idx_inventory_orders_brand_created", columnList = "brand_id, created_at"),
                @Index(name = "idx_inventory_orders_brand_store_status", columnList = "brand_id, store_id, status")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InventoryOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private String storeName;

    @Column(nullable = false)
    private Long inventoryItemId;

    @Column(nullable = false)
    private String productCode;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private Integer currentQuantity;

    @Column(nullable = false)
    private Integer minQuantity;

    @Column(nullable = false)
    private Integer orderQuantity;

    @Column(nullable = false)
    private Integer unitPrice;

    @Column(nullable = false)
    private Integer expectedAmount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PREPARING;

    @Column(nullable = false)
    private Long requestedById;

    @Column(nullable = false)
    private String requestedByName;

    private String canceledReason;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** 발주 진행 상태를 변경합니다. */
    public void changeStatus(OrderStatus status) {
        this.status = status;
        if (status != OrderStatus.CANCELED) {
            this.canceledReason = null;
        }
    }

    /** 발주를 취소하고 사유를 남깁니다. */
    public void cancel(String reason) {
        this.status = OrderStatus.CANCELED;
        this.canceledReason = reason;
    }
}

