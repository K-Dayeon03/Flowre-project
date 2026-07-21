package com.flowre.server.domain.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AsStatusResponse {

    private long newCount;
    private long inProgressCount;
    private long doneCount;
    private long urgentCount;
    private int completionRate;
    private LocalDateTime updatedAt;
}
