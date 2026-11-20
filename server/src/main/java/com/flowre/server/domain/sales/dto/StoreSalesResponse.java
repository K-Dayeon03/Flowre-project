package com.flowre.server.domain.sales.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StoreSalesResponse {

    private Long storeId;
    private String storeName;
    private Integer totalRevenue;
    private Integer totalOrders;
    private Double comparedToPrevious;
}

