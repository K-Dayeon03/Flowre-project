package com.flowre.server.domain.store.dto;

import com.flowre.server.domain.store.entity.Store;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NearbyStoreResponse {

    private String storeCode;
    private String storeName;
    private long distanceMeters;

    /** 가까운 매장 공개 API용 최소 응답 DTO를 생성합니다. */
    public static NearbyStoreResponse from(Store store, long distanceMeters) {
        return NearbyStoreResponse.builder()
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .distanceMeters(distanceMeters)
                .build();
    }
}
