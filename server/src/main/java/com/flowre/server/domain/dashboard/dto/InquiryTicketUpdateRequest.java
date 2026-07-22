package com.flowre.server.domain.dashboard.dto;

import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class InquiryTicketUpdateRequest {

    @NotBlank
    private String title;

    private String content;

    private InquiryStatus status;
}
