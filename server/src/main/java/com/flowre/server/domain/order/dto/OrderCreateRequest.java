package com.flowre.server.domain.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OrderCreateRequest {

    @NotNull(message = "재고 항목을 선택해주세요.")
    private Long inventoryItemId;

    @NotNull(message = "발주 수량을 입력해주세요.")
    @Min(value = 1, message = "발주 수량은 1개 이상이어야 합니다.")
    private Integer orderQuantity;

    @Min(value = 0, message = "단가는 0원 이상이어야 합니다.")
    private Integer unitPrice;
}

