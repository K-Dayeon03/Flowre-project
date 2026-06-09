package com.flowre.server.domain.store.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "stores",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_store_brand_code", columnNames = {"brand_id", "store_code"})
        },
        indexes = {
                @Index(name = "idx_store_brand_code", columnList = "brand_id, store_code")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long brandId;

    @Column(nullable = false, length = 4)
    private String storeCode;

    @Column(nullable = false)
    private String storeName;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
