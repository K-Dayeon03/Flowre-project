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

    /** 우편번호 (다음 우편번호 서비스에서 받아온 5자리) */
    @Column(length = 5)
    private String postalCode;

    /** 도로명 주소 */
    private String roadAddress;

    /** 지번 주소 */
    private String jibunAddress;

    /** 상세 주소 (직접 입력) */
    private String detailAddress;

    private Double latitude;

    private Double longitude;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** 매장 주소 정보를 갱신합니다. */
    public void updateAddress(String postalCode, String roadAddress, String jibunAddress, String detailAddress) {
        this.postalCode = postalCode;
        this.roadAddress = roadAddress;
        this.jibunAddress = jibunAddress;
        this.detailAddress = detailAddress;
    }

    /** 매장의 위도·경도 좌표를 갱신합니다. */
    public void updateCoordinates(Double latitude, Double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
