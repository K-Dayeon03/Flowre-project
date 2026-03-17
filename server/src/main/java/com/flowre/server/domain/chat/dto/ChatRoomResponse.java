package com.flowre.server.domain.chat.dto;

import com.flowre.server.domain.chat.entity.ChatRoom;
import com.flowre.server.domain.chat.entity.Message;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatRoomResponse {

    private Long id;
    private String name;
    private String type;
    private Long storeId;
    private String lastMessage;
    private String lastAt;
    private int unread;
    private int members;

    public static ChatRoomResponse of(ChatRoom room, Message lastMsg, int unread) {
        return ChatRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .type(room.getType().name())
                .storeId(room.getStoreId())
                .lastMessage(lastMsg != null ? lastMsg.getContent() : "")
                .lastAt(lastMsg != null && lastMsg.getSentAt() != null
                        ? lastMsg.getSentAt().toString() : "")
                .unread(unread)
                .members(room.getMembers().size())
                .build();
    }
}
