package com.flowre.server.domain.audit.entity;

/**
 * 감사 로그에 기록되는 행위 유형.
 * 매장 운영상 추적이 필요한 민감 작업(완료 처리, 재고 변동, 계정 승인 등)을 분류한다.
 */
public enum AuditAction {
    SCHEDULE_COMPLETED,   // 스케줄 완료 처리
    INVENTORY_DEDUCTED,   // 본사 재고 차감
    INVENTORY_ADJUSTED,   // 매장 재고 증감
    EMPLOYEE_APPROVED,    // 직원 계정 승인
    EMPLOYEE_REJECTED,    // 직원 계정 거절
    EMPLOYEE_UPDATED,     // 직원 정보 수정·비밀번호 초기화·코드 로테이션
    EMPLOYEE_DELETED      // 직원 계정 비활성화
}
