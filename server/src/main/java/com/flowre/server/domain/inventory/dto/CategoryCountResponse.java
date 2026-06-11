package com.flowre.server.domain.inventory.dto;

import com.flowre.server.domain.inventory.entity.ProductCategory;
import lombok.Builder;
import lombok.Getter;

/** 카테고리별 재고 건수 (직원이 카테고리 칩에서 개수를 보고 선택하도록). */
@Getter
@Builder
public class CategoryCountResponse {

    /** 카테고리 코드 (enum name, 예: OUTER) — 클라이언트 필터 파라미터로 사용. */
    private String category;
    /** 화면 표시용 한글 라벨 (예: 아우터). */
    private String label;
    /** 해당 카테고리 재고 건수. */
    private long count;

    public static CategoryCountResponse of(ProductCategory category, long count) {
        return CategoryCountResponse.builder()
                .category(category.name())
                .label(category.getLabel())
                .count(count)
                .build();
    }
}
