package com.flowre.server.domain.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class CreateDirectRoomRequest {

    @NotNull(message = "대화 상대 ID를 입력해주세요.")
    private Long targetUserId;
}
