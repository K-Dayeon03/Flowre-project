package com.flowre.server.domain.user.service;

import com.flowre.server.domain.notification.entity.NotificationType;
import com.flowre.server.domain.notification.service.NotificationService;
import com.flowre.server.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 직원 계정 승인 플로우 알림 서비스.
 *
 * 본사가 매장 직원 계정을 발급하면 해당 매장 점장에게 승인 요청 알림을 보낸다.
 * 인앱 알림 저장과 FCM 푸시는 통합 {@link NotificationService}로 일원화되어 있어,
 * 본 서비스는 승인 도메인에 맞는 메시지를 구성해 위임만 한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalNotificationService {

    private final NotificationService notificationService;

    /**
     * 신규 승인 대기 직원이 생겼음을 해당 매장의 활성 점장들에게 알립니다.
     *
     * @param managers       알림 대상 점장 목록 (활성 STORE_MANAGER)
     * @param pendingEmployee 승인 대기 상태로 생성된 직원
     */
    public void notifyManagersOfPendingEmployee(List<User> managers, User pendingEmployee) {
        if (managers.isEmpty()) {
            log.info("[Approval] 승인 대기 직원 생성 — 알림 대상 점장 없음. employeeCode={}, store={}",
                    pendingEmployee.getEmployeeCode(), pendingEmployee.getStoreCode());
            return;
        }

        String title = "직원 승인 요청";
        String body = String.format("%s 매장의 신규 직원 '%s'(%s) 승인 요청이 도착했습니다.",
                pendingEmployee.getStoreName(), pendingEmployee.getName(), pendingEmployee.getEmployeeCode());

        notificationService.notifyAll(managers, NotificationType.APPROVAL_REQUEST, title, body,
                "EMPLOYEE", pendingEmployee.getId());
    }
}
