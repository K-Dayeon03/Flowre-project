package com.flowre.server.domain.chat.dto;

import com.flowre.server.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatMemberResponse {

    private Long id;
    private String name;
    private String employeeCode;
    private String role;
    private String storeName;

    public static ChatMemberResponse of(User user) {
        return ChatMemberResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .employeeCode(user.getEmployeeCode())
                .role(user.getRole().name())
                .storeName(user.getStoreName())
                .build();
    }
}
