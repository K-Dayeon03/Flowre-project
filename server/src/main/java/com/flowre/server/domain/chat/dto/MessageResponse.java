package com.flowre.server.domain.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private String fileName;
    private String sentAt;
    private boolean isMe;

    /**
     * 현재 조회 사용자가 보낸 메시지인지 여부.
     *
     * boolean 필드 `isMe`의 Lombok 기본 게터(`isMe()`)는 Jackson 직렬화 시 JSON
     * 키가 `me`로 바뀐다. 프론트(`Message.isMe`)와 맞추기 위해 게터를 직접 정의하고
     * `@JsonProperty("isMe")`로 키를 고정한다. (게터를 명시하면 Lombok @Getter는
     * 중복 생성하지 않는다.)
     */
    @JsonProperty("isMe")
    public boolean isMe() {
        return isMe;
    }

    public static MessageResponse of(Message m, Long currentUserId) {
        return MessageResponse.builder()
                .id(m.getId())
                .roomId(m.getRoomId())
                .senderId(m.getSenderId())
                .senderName(m.getSenderName())
                .content(m.getContent())
                .type(m.getType().name())
                .fileName(m.getFileName())
                .sentAt(m.getSentAt() != null ? m.getSentAt().toString() : "")
                .isMe(m.getSenderId().equals(currentUserId))
                .build();
    }
}
