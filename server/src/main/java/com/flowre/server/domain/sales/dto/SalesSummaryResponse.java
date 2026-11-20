package com.flowre.server.domain.sales.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesSummaryResponse {

    private SalesPeriodMetric today;
    private SalesPeriodMetric week;
    private SalesPeriodMetric month;

    @Getter
    @Builder
    public static class SalesPeriodMetric {
        private Integer totalRevenue;
        private Integer totalOrders;
        private Integer averageOrderValue;
        private Double comparedToPrevious;
    }
}

