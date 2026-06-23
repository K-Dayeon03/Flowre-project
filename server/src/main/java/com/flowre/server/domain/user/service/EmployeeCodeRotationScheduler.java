package com.flowre.server.domain.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 직원 코드 자동 로테이션 스케줄러.
 *
 * 매일 오전 2시에 실행되며, 마지막 로테이션 이후 설정된 주기(기본 90일)가 지난
 * 비-ADMIN 활성 계정의 직원 코드를 자동으로 순환합니다.
 * ADMIN(storeCode=0000) 계정은 대상에서 영구 제외됩니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeCodeRotationScheduler {

    private final UserService userService;

    /** 매일 오전 2시에 만료된 직원 코드를 자동 순환합니다. */
    @Scheduled(cron = "0 0 2 * * *")
    public void runDailyRotation() {
        log.info("[Scheduler] 직원 코드 자동 로테이션 시작");
        try {
            int count = userService.rotateExpiredCodes();
            log.info("[Scheduler] 직원 코드 자동 로테이션 완료 — 처리 계정: {}개", count);
        } catch (Exception e) {
            log.error("[Scheduler] 직원 코드 자동 로테이션 중 오류 발생", e);
        }
    }
}
