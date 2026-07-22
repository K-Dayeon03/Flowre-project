package com.flowre.server.domain.schedule.dto;

import com.flowre.server.domain.schedule.entity.ScheduleType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleUpdateRequest {

    @Size(max = 100, message = "제목은 100자 이하로 입력해주세요.")
    @Pattern(regexp = ".*\\S.*", message = "제목을 입력해주세요.")
    private String title;

    private ScheduleType type;

    private LocalDateTime dueDate;

    @Size(max = 50, message = "담당자는 50자 이하로 입력해주세요.")
    private String assignee;

    @Size(max = 1000, message = "설명은 1000자 이하로 입력해주세요.")
    private String description;
}
