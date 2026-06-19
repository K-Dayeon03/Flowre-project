package com.flowre.server.domain.store.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AddressSearchResponse {
    private String postalCode;
    private String roadAddress;
    private String jibunAddress;
    private Double latitude;
    private Double longitude;
}
