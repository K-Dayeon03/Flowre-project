package com.flowre.server.domain.inventory.entity;

/** 재고 수량과 최소 보유 수량으로 계산하는 재고 상태입니다. */
public enum StockStatus {
    OUT_OF_STOCK,
    LOW,
    SUFFICIENT
}

