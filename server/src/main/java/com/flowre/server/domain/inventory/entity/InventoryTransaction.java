package com.flowre.server.domain.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "inventory_transactions",
        indexes = {
                @Index(name = "idx_inv_tx_brand_item", columnList = "brand_id, inventory_item_id, created_at"),
                @Index(name = "idx_inv_tx_brand_store", columnList = "brand_id, store_id, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long inventoryItemId;

    @Column(nullable = false)
    private String productCode;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Integer remainingQuantity;

    private String reason;

    @Column(nullable = false)
    private Long usedById;

    @Column(nullable = false)
    private String usedByName;

    @CreatedDate
    private LocalDateTime createdAt;
}
