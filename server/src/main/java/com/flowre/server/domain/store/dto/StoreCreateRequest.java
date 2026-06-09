package com.flowre.server.domain.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

@Getter
public class StoreCreateRequest {

    @NotBlank(message = "점별 코드를 입력해주세요.")
    @Pattern(regexp = "^\\d{4}$", message = "점별 코드는 숫자 4자리여야 합니다.")
    private String storeCode;

    @NotBlank(message = "매장명을 입력해주세요.")
    private String storeName;
}
