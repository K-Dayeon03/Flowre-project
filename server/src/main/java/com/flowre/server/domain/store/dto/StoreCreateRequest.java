package com.flowre.server.domain.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

/**
 * 본사(HQ/ADMIN)가 신규 매장을 등록할 때 사용하는 요청 DTO.
 *
 * 주소 정보는 클라이언트의 다음(카카오) 우편번호 서비스에서 선택한 값을 전달받는다.
 * 우편번호·도로명 주소는 필수이며, 지번 주소·상세 주소는 선택 입력이다.
 */
@Getter
public class StoreCreateRequest {

    @NotBlank(message = "점별 코드를 입력해주세요.")
    @Pattern(regexp = "^\\d{4}$", message = "점별 코드는 숫자 4자리여야 합니다.")
    private String storeCode;

    @NotBlank(message = "매장명을 입력해주세요.")
    private String storeName;

    @NotBlank(message = "우편번호를 입력해주세요.")
    @Pattern(regexp = "^\\d{5}$", message = "우편번호는 숫자 5자리여야 합니다.")
    private String postalCode;

    @NotBlank(message = "도로명 주소를 입력해주세요.")
    private String roadAddress;

    private String jibunAddress;

    private String detailAddress;
}
