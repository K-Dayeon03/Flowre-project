package com.flowre.server.domain.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;

import java.util.List;

@Getter
public class CreateRoomRequest {

    @NotBlank(message = "채팅방 이름을 입력해주세요.")
    private String name;

    @NotEmpty(message = "참여자를 1명 이상 선택해주세요.")
    private List<Long> memberUserIds;
}
