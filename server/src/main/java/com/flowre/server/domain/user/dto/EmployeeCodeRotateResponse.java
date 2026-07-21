package com.flowre.server.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/** 직원 코드 로테이션 결과 응답 DTO. */
@Getter
@Builder
public class EmployeeCodeRotateResponse {

    /** 새로 발급된 직원 아이디 */
    private String newEmployeeCode;

    /** 로테이션 처리 시각 */
    private LocalDateTime rotatedAt;

    /** 다음 예정 로테이션 시각 */
    private LocalDateTime nextRotationAt;
}
