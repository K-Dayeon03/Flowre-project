package com.flowre.server.domain.chat.dto;

import com.flowre.server.domain.chat.entity.Message;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MessageResponse {

    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String content;
    private String type;
    private String sentAt;
    private boolean isMe;

    public static MessageResponse of(Message m, Long currentUserId) {
        return MessageResponse.builder()
                .id(m.getId())
                .roomId(m.getRoomId())
                .senderId(m.getSenderId())
                .senderName(m.getSenderName())
                .content(m.getContent())
                .type(m.getType().name())
                .sentAt(m.getSentAt() != null ? m.getSentAt().toString() : "")
                .isMe(m.getSenderId().equals(currentUserId))
                .build();
    }
}
