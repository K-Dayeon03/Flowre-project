package com.flowre.server.domain.schedule.dto;

import com.flowre.server.domain.schedule.entity.ScheduleType;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleUpdateRequest {
    private String title;
    private ScheduleType type;
    private LocalDateTime dueDate;
    private String assignee;
    private String description;
}
