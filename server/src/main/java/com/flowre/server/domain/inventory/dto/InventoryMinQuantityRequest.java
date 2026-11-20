package com.flowre.server.domain.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InventoryMinQuantityRequest {

    @NotNull(message = "최소 보유 수량을 입력해주세요.")
    @Min(value = 0, message = "최소 보유 수량은 0 이상이어야 합니다.")
    private Integer minQuantity;
}

