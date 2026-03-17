package com.flowre.server.domain.schedule.dto;

import com.flowre.server.domain.schedule.entity.ScheduleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleRequest {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotNull(message = "유형을 선택해주세요.")
    private ScheduleType type;

    @NotNull(message = "마감일을 입력해주세요.")
    private LocalDateTime dueDate;

    private String assignee;
    private String description;
}
