package com.flowre.server.domain.dashboard.dto;

import com.flowre.server.domain.dashboard.entity.InquiryTicket;
import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RecentInquiryResponse {

    private Long id;
    private String storeName;
    private String requesterName;
    private String title;
    private InquiryStatus status;
    private LocalDateTime createdAt;

    public static RecentInquiryResponse from(InquiryTicket ticket) {
        return RecentInquiryResponse.builder()
                .id(ticket.getId())
                .storeName(ticket.getStoreName())
                .requesterName(ticket.getRequesterName())
                .title(ticket.getTitle())
                .status(ticket.getStatus())
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
