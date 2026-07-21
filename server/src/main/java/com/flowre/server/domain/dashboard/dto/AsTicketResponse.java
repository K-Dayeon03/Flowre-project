package com.flowre.server.domain.dashboard.dto;

import com.flowre.server.domain.dashboard.entity.AsTicket;
import com.flowre.server.domain.dashboard.entity.AsTicketPriority;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AsTicketResponse {

    private Long id;
    private Long storeId;
    private String storeName;
    private String title;
    private String description;
    private AsTicketStatus status;
    private AsTicketPriority priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AsTicketResponse from(AsTicket ticket) {
        return AsTicketResponse.builder()
                .id(ticket.getId())
                .storeId(ticket.getStoreId())
                .storeName(ticket.getStoreName())
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}
