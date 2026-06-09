package com.flowre.server.domain.inventory.dto;

import com.flowre.server.domain.inventory.entity.InventoryLabel;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class InventoryLabelResponse {

    private Long id;
    private String name;

    /** 엔티티를 클라이언트 응답 DTO로 변환합니다. */
    public static InventoryLabelResponse from(InventoryLabel label) {
        return InventoryLabelResponse.builder()
                .id(label.getId())
                .name(label.getName())
                .build();
    }
}
