package com.flowre.server.domain.dashboard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class InquiryTicketCreateRequest {

    private Long storeId;

    @NotBlank
    private String requesterName;

    @NotBlank
    private String title;

    private String content;
}
