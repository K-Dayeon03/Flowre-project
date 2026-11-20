package com.flowre.server.domain.user.service;

import com.flowre.server.domain.user.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 직원 가입 완료 문자 안내를 담당합니다.
 *
 * 실제 SMS 발송사는 환경·발신번호 인증이 필요하므로 현재 구현은 발송 지점을 로그로 남깁니다.
 * 이후 CoolSMS, Naver SENS, Twilio 등 provider 클라이언트를 이 서비스 내부에 연결하면 됩니다.
 */
@Slf4j
@Service
public class SignupSmsNotificationService {

    /** 승인 또는 즉시 활성화된 직원에게 가입 완료 안내 문자를 발송합니다. */
    public void notifySignupCompleted(User user) {
        if (!StringUtils.hasText(user.getPhoneNumber())) {
            return;
        }

        log.info("[SMS] 가입 완료 안내 발송 요청 — phone={}, employeeCode={}, store={}",
                maskPhoneNumber(user.getPhoneNumber()), user.getEmployeeCode(), user.getStoreName());
    }

    private String maskPhoneNumber(String phoneNumber) {
        String digits = phoneNumber.replaceAll("\\D", "");
        if (digits.length() < 7) {
            return "***";
        }
        return digits.substring(0, 3) + "****" + digits.substring(digits.length() - 4);
    }
}
