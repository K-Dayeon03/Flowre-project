package com.flowre.server.domain.dashboard.dto;

import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import com.flowre.server.domain.dashboard.entity.InquiryTicket;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class InquiryTicketResponse {

    private Long id;
    private Long storeId;
    private String storeName;
    private String requesterName;
    private String title;
    private String content;
    private InquiryStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static InquiryTicketResponse from(InquiryTicket ticket) {
        return InquiryTicketResponse.builder()
                .id(ticket.getId())
                .storeId(ticket.getStoreId())
                .storeName(ticket.getStoreName())
                .requesterName(ticket.getRequesterName())
                .title(ticket.getTitle())
                .content(ticket.getContent())
                .status(ticket.getStatus())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}
