package com.flowre.server.domain.store.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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

    @NotBlank(message = "매장명을 입력해주세요.")
    private String storeName;

    @NotBlank(message = "우편번호를 입력해주세요.")
    @Pattern(regexp = "^\\d{5}$", message = "우편번호는 숫자 5자리여야 합니다.")
    private String postalCode;

    @NotBlank(message = "도로명 주소를 입력해주세요.")
    private String roadAddress;

    private String jibunAddress;

    private String detailAddress;

    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
    @DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다.")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
    @DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다.")
    private Double longitude;
}
