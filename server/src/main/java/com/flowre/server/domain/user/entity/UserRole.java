package com.flowre.server.domain.user.entity;

public enum UserRole {
    STORE_STAFF,    // 매장 일반 직원
    STORE_MANAGER,  // 매장 점장
    HQ_STAFF,       // 본사 직원
    ADMIN;          // 시스템 관리자

    /**
     * 브랜드 내 전 매장 데이터를 조회할 수 있는 권한인지 여부.
     * 본사(HQ_STAFF)·관리자(ADMIN)는 전 매장, 매장 직원·점장은 자기 매장으로 제한된다.
     */
    public boolean canViewAllStores() {
        return this == HQ_STAFF || this == ADMIN;
    }
}
