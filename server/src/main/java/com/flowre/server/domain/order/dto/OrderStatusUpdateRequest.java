package com.flowre.server.domain.order.dto;

import com.flowre.server.domain.order.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OrderStatusUpdateRequest {

    @NotNull(message = "발주 상태를 선택해주세요.")
    private OrderStatus status;
}

