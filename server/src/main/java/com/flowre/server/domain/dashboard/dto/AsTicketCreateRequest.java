package com.flowre.server.domain.dashboard.dto;

import com.flowre.server.domain.dashboard.entity.AsTicketPriority;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class AsTicketCreateRequest {

    private Long storeId;

    @NotBlank
    private String title;

    private String description;

    private AsTicketPriority priority;
}
