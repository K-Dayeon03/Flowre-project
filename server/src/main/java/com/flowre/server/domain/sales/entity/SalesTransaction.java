package com.flowre.server.domain.sales.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** 매장별 매출 거래 단위입니다. */
@Entity
@Table(
        name = "sales_transactions",
        indexes = {
                @Index(name = "idx_sales_brand_store_time", columnList = "brand_id, store_id, transaction_date_time"),
                @Index(name = "idx_sales_brand_time", columnList = "brand_id, transaction_date_time")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class SalesTransaction {

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
    private LocalDateTime transactionDateTime;

    @Column(nullable = false)
    private Integer amount;

    @Builder.Default
    @Column(nullable = false)
    private Integer orderCount = 1;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod paymentMethod = PaymentMethod.OTHER;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SalesSource source = SalesSource.MANUAL;

    @CreatedDate
    private LocalDateTime createdAt;
}

