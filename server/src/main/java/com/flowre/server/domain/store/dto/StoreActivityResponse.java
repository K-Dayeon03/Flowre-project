package com.flowre.server.domain.store.dto;

import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.entity.StoreOperationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class StoreActivityResponse {

    private Long storeId;
    private String storeCode;
    private String storeName;
    private StoreOperationStatus operationStatus;
    private LocalDateTime lastActivityAt;   // 그룹 채팅 마지막 메시지 시각
    private int todayScheduleTotal;
    private int todayScheduleDone;
    private long activeStaffCount;

    public static StoreActivityResponse of(
            Store store,
            LocalDateTime lastActivityAt,
            int todayScheduleTotal,
            int todayScheduleDone,
            long activeStaffCount
    ) {
        return StoreActivityResponse.builder()
                .storeId(store.getId())
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .operationStatus(store.getOperationStatus())
                .lastActivityAt(lastActivityAt)
                .todayScheduleTotal(todayScheduleTotal)
                .todayScheduleDone(todayScheduleDone)
                .activeStaffCount(activeStaffCount)
                .build();
    }
}
