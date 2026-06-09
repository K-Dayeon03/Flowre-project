package com.flowre.server.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

@Getter
public class LoginRequest {

    @NotBlank(message = "점별 코드를 입력해주세요.")
    @Pattern(regexp = "^\\d{4}$", message = "점별 코드는 숫자 4자리여야 합니다.")
    private String storeCode;

    @NotBlank(message = "직원 아이디를 입력해주세요.")
    @Pattern(regexp = "^\\d{4}[A-Za-z]{4}[!@#$%^&*?]$", message = "직원 아이디는 점별 코드 4자리, 영문 4글자, 특수문자 1개 형식이어야 합니다.")
    private String employeeCode;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String password;
}
