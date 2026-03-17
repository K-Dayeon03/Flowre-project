package com.flowre.server.domain.chat.dto;

import com.flowre.server.domain.chat.entity.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class SendMessageRequest {

    @NotNull
    private Long roomId;

    @NotBlank(message = "메시지를 입력해주세요.")
    private String content;

    @NotNull
    private MessageType type;
}
