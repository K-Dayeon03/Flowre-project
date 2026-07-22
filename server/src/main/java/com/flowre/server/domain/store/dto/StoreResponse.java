package com.flowre.server.domain.store.dto;

import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.entity.StoreOperationStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StoreResponse {
    private Long id;
    private Long brandId;
    private String storeCode;
    private String storeName;
    private String postalCode;
    private String roadAddress;
    private String jibunAddress;
    private String detailAddress;
    private Double latitude;
    private Double longitude;
    private StoreOperationStatus operationStatus;
    private boolean active;

    /** 매장 엔티티를 API 응답 DTO로 변환합니다. */
    public static StoreResponse from(Store store) {
        return StoreResponse.builder()
                .id(store.getId())
                .brandId(store.getBrandId())
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .postalCode(store.getPostalCode())
                .roadAddress(store.getRoadAddress())
                .jibunAddress(store.getJibunAddress())
                .detailAddress(store.getDetailAddress())
                .latitude(store.getLatitude())
                .longitude(store.getLongitude())
                .operationStatus(store.getOperationStatus())
                .active(store.isActive())
                .build();
    }
}
