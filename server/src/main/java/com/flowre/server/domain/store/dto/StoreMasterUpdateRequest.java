package com.flowre.server.domain.store.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

/**
 * 본사(HQ/ADMIN)가 업로드로 자동 생성된 매장 마스터 정보를 정리할 때 사용하는 요청 DTO.
 */
@Getter
public class StoreMasterUpdateRequest {

    @NotBlank(message = "매장명을 입력해주세요.")
    private String storeName;

    @Pattern(regexp = "^$|^\\d{5}$", message = "우편번호는 숫자 5자리여야 합니다.")
    private String postalCode;

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
