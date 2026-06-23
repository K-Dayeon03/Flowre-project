package com.flowre.server.domain.user.dto;

import com.flowre.server.domain.user.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 직원 계정 정보 수정 요청 DTO.
 * 이름·이메일·역할만 변경 가능하며, 코드·비밀번호는 별도 API로 처리한다.
 */
@Getter
@NoArgsConstructor
public class EmployeeUpdateRequest {

    @NotBlank(message = "이름을 입력해주세요.")
    private String name;

    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private String email;

    @NotNull(message = "권한을 선택해주세요.")
    private UserRole role;
}
