package com.flowre.server.domain.notification.entity;

/**
 * 인앱 알림 유형. 매장 운영 중 직원에게 전달해야 하는 이벤트를 분류한다.
 */
public enum NotificationType {
    APPROVAL_REQUEST,   // 직원 계정 승인 요청 (점장 대상)
    SCHEDULE_DUE,       // 스케줄 마감 임박
    INVENTORY_LOW,      // 재고 부족
    GENERAL             // 일반 공지성 알림
}
