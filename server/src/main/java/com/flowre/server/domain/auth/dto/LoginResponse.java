package com.flowre.server.domain.auth.dto;

import com.flowre.server.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;
    private UserInfo user;

    @Getter
    @Builder
    public static class UserInfo {
        private Long id;
        private String email;
        private String employeeCode;
        private String name;
        private String role;
        private Long brandId;
        private Long storeId;
        private String storeCode;
        private String storeName;
    }

    public static LoginResponse of(String accessToken, User user) {
        return LoginResponse.builder()
                .accessToken(accessToken)
                .user(UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .employeeCode(user.getEmployeeCode())
                        .name(user.getName())
                        .role(user.getRole().name())
                        .brandId(user.getBrandId())
                        .storeId(user.getStoreId())
                        .storeCode(user.getStoreCode())
                        .storeName(user.getStoreName())
                        .build())
                .build();
    }
}
