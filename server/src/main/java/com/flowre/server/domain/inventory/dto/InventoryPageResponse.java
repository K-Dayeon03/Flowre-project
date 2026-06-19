package com.flowre.server.domain.inventory.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 재고 목록 페이지 응답 — 페이지네이션 메타 정보 포함.
 */
@Getter
@Builder
public class InventoryPageResponse {

    private List<InventoryResponse> items;
    private long totalCount;
    private int totalPages;
    private boolean hasNext;

    /** 페이지 결과로 응답 객체를 생성합니다. */
    public static InventoryPageResponse of(List<InventoryResponse> items, long totalCount,
                                           int totalPages, boolean hasNext) {
        return InventoryPageResponse.builder()
                .items(items)
                .totalCount(totalCount)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .build();
    }
}
