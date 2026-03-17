package com.flowre.server.domain.schedule.dto;

import com.flowre.server.domain.schedule.entity.Schedule;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ScheduleResponse {

    private Long id;
    private String title;
    private String type;
    private String status;
    private LocalDateTime dueDate;
    private String assignee;
    private Long storeId;
    private String description;
    private String createdAt;
    private String createdBy;

    public static ScheduleResponse from(Schedule s) {
        return ScheduleResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .type(s.getType().name())
                .status(s.getStatus().name())
                .dueDate(s.getDueDate())
                .assignee(s.getAssignee())
                .storeId(s.getStoreId())
                .description(s.getDescription())
                .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)
                .createdBy(s.getCreatedBy())
                .build();
    }
}
