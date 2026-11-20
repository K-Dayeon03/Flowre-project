package com.flowre.server.domain.sales.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class HourlySalesResponse {

    private Integer hour;
    private Integer totalRevenue;
    private Integer totalOrders;
}

