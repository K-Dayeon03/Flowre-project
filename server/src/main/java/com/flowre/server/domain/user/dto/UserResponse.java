package com.flowre.server.domain.user.dto;

import com.flowre.server.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

/**
 * 직원 계정 조회 응답 DTO. 비밀번호 등 민감 정보는 노출하지 않는다.
 */
@Getter
@Builder
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String employeeCode;
    private String role;
    private Long brandId;
    private Long storeId;
    private String storeCode;
    private String storeName;

    /** 사용자 엔티티를 API 응답 DTO로 변환합니다. */
    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .employeeCode(user.getEmployeeCode())
                .role(user.getRole().name())
                .brandId(user.getBrandId())
                .storeId(user.getStoreId())
                .storeCode(user.getStoreCode())
                .storeName(user.getStoreName())
                .build();
    }
}
