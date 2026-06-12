package com.flowre.server.domain.user.entity;

/**
 * 직원 계정 승인 상태.
 *
 * 본사(HQ/ADMIN)가 매장 직원 계정을 발급하면, 해당 매장에 점장이 존재할 경우
 * {@link #PENDING} 상태로 생성되어 점장 승인 전까지 로그인할 수 없다. 점장이
 * 실제 매장 소속 직원임을 확인해 승인하면 {@link #ACTIVE}, 거절하면 {@link #REJECTED}가 된다.
 */
public enum UserStatus {
    /** 승인 대기 — 점장 승인 전까지 로그인 불가 */
    PENDING,
    /** 활성 — 정상 로그인 가능 */
    ACTIVE,
    /** 거절 — 점장이 매장 소속이 아니라고 판단해 반려한 계정 */
    REJECTED
}
