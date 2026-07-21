package com.flowre.server.domain.dashboard.dto;

import com.flowre.server.domain.dashboard.entity.AsTicketPriority;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class AsTicketUpdateRequest {

    @NotBlank
    private String title;

    private String description;

    private AsTicketStatus status;

    private AsTicketPriority priority;
}
