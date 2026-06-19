package com.flowre.server.domain.user.entity;

public enum UserRole {
    STORE_STAFF,    // 매장 일반 직원
    STORE_MANAGER,  // 매장 점장
    HQ_STAFF,       // 본사 직원
    ADMIN;          // 시스템 관리자

    /** 본사 측 권한(HQ_STAFF·ADMIN)인지 여부 — 매장·직원·재고 관리의 공통 기준. */
    public boolean isHeadquarters() {
        return this == HQ_STAFF || this == ADMIN;
    }

    /**
     * 브랜드 내 전 매장 데이터를 조회할 수 있는 권한인지 여부.
     * 본사(HQ_STAFF)·관리자(ADMIN)는 전 매장, 매장 직원·점장은 자기 매장으로 제한된다.
     */
    public boolean canViewAllStores() {
        return isHeadquarters();
    }

    /** 매장·직원·재고를 관리할 수 있는 권한(본사 측)인지 여부. */
    public boolean canManage() {
        return isHeadquarters();
    }

    /** 공지를 작성할 수 있는 권한인지 여부 — 점장(STORE_MANAGER) 이상. */
    public boolean canCreateNotice() {
        return this == STORE_MANAGER || isHeadquarters();
    }

    /** 본인이 업로드하지 않은 문서도 수정·삭제할 수 있는 관리 권한 — 본사(HQ_STAFF·ADMIN)만. */
    public boolean canModifyAnyDocument() {
        return isHeadquarters();
    }
}
