package com.flowre.server.domain.store.dto;

import com.flowre.server.domain.store.entity.Store;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StoreResponse {
    private Long id;
    private Long brandId;
    private String storeCode;
    private String storeName;
    private boolean active;

    /** 매장 엔티티를 API 응답 DTO로 변환합니다. */
    public static StoreResponse from(Store store) {
        return StoreResponse.builder()
                .id(store.getId())
                .brandId(store.getBrandId())
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .active(store.isActive())
                .build();
    }
}
