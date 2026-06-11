package com.flowre.server.domain.user.dto;

import com.flowre.server.domain.user.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

/**
 * 본사(HQ/ADMIN)가 신규 직원 계정을 발급할 때 사용하는 요청 DTO.
 *
 * 직원 아이디는 로그인과 동일한 형식(점별 코드 4자리 + 영문 4글자 + 특수문자 1개)을 따르며,
 * 점별 코드로 시작해야 한다. 초기 비밀번호는 본사가 직접 지정한다.
 */
@Getter
public class EmployeeCreateRequest {

    @NotBlank(message = "이름을 입력해주세요.")
    private String name;

    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private String email;

    @NotBlank(message = "점별 코드를 입력해주세요.")
    @Pattern(regexp = "^\\d{4}$", message = "점별 코드는 숫자 4자리여야 합니다.")
    private String storeCode;

    @NotBlank(message = "직원 아이디를 입력해주세요.")
    @Pattern(regexp = "^\\d{4}[A-Za-z]{4}[!@#$%^&*?]$", message = "직원 아이디는 점별 코드 4자리, 영문 4글자, 특수문자 1개 형식이어야 합니다.")
    private String employeeCode;

    @NotBlank(message = "초기 비밀번호를 입력해주세요.")
    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
    private String password;

    @NotNull(message = "권한을 선택해주세요.")
    private UserRole role;
}
