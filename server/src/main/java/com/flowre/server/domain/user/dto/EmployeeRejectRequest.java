package com.flowre.server.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

/**
 * 점장(또는 관리자)이 승인 대기 직원 계정을 거절할 때 사용하는 요청 DTO.
 */
@Getter
public class EmployeeRejectRequest {

    @NotBlank(message = "거절 사유를 입력해주세요.")
    @Size(max = 200, message = "거절 사유는 200자 이하여야 합니다.")
    private String reason;
}
