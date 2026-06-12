package com.flowre.server.domain.user.service;

import com.flowre.server.domain.user.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 직원 계정 승인 플로우 알림 서비스.
 *
 * 본사가 매장 직원 계정을 발급하면 해당 매장 점장에게 승인 요청 푸시를 보내야 한다.
 * 현재 FCM(firebase-admin) 의존성은 비활성화되어 있어, 본 서비스는 발송 대상과 메시지를
 * 로깅하는 스텁으로 동작한다. 실제 FCM 연동 시 {@link #dispatch} 내부에서
 * FirebaseMessaging.sendMulticast(...)를 호출하도록 교체하면 된다.
 */
@Slf4j
@Service
public class ApprovalNotificationService {

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

        List<String> tokens = managers.stream()
                .map(User::getFcmToken)
                .filter(token -> token != null && !token.isBlank())
                .toList();

        dispatch(tokens, title, body);
    }

    /**
     * FCM 푸시 발송 지점. 현재는 발송 대상·메시지를 로깅만 한다.
     * 실제 FCM 연동 시 이 메서드 본문을 FirebaseMessaging 호출로 교체한다.
     */
    private void dispatch(List<String> tokens, String title, String body) {
        log.info("[Approval] FCM 푸시 발송(stub) — 대상 토큰 {}건, title={}, body={}",
                tokens.size(), title, body);
    }
}
