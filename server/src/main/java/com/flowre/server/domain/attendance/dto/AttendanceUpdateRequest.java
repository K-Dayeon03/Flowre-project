package com.flowre.server.domain.attendance.dto;

import com.flowre.server.domain.attendance.entity.AttendanceStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class AttendanceUpdateRequest {

    private LocalDateTime clockInAt;
    private LocalDateTime clockOutAt;
    private AttendanceStatus status;
    private String note;
}

