package com.flowre.server.domain.user.dto;

import com.flowre.server.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

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
    private String status;
    private String rejectReason;
    private Long brandId;
    private Long storeId;
    private String storeCode;
    private String storeName;
    /** 직원 코드 마지막 로테이션 시각 — null이면 발급 이후 한 번도 순환되지 않은 상태 */
    private LocalDateTime codeRotatedAt;
    /** 생성 시각 */
    private LocalDateTime createdAt;

    /** 사용자 엔티티를 API 응답 DTO로 변환합니다. */
    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .employeeCode(user.getEmployeeCode())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .rejectReason(user.getRejectReason())
                .brandId(user.getBrandId())
                .storeId(user.getStoreId())
                .storeCode(user.getStoreCode())
                .storeName(user.getStoreName())
                .codeRotatedAt(user.getCodeRotatedAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
