package com.flowre.server.domain.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

/**
 * 본사(HQ/ADMIN)가 기존 매장의 주소 정보를 수정할 때 사용하는 요청 DTO.
 *
 * 클라이언트의 다음(카카오) 우편번호 서비스에서 선택한 값을 전달받는다.
 */
@Getter
public class StoreAddressUpdateRequest {

    @NotBlank(message = "우편번호를 입력해주세요.")
    @Pattern(regexp = "^\\d{5}$", message = "우편번호는 숫자 5자리여야 합니다.")
    private String postalCode;

    @NotBlank(message = "도로명 주소를 입력해주세요.")
    private String roadAddress;

    private String jibunAddress;

    private String detailAddress;
}
