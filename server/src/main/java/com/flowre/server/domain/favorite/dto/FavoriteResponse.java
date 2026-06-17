package com.flowre.server.domain.favorite.dto;

import com.flowre.server.domain.favorite.entity.Favorite;
import com.flowre.server.domain.favorite.entity.FavoriteTargetType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class FavoriteResponse {

    private Long id;
    private FavoriteTargetType targetType;
    private Long targetId;
    private String targetKey;
    private String label;
    private LocalDateTime createdAt;

    /** 즐겨찾기 엔티티를 API 응답 DTO로 변환합니다. */
    public static FavoriteResponse from(Favorite favorite) {
        return FavoriteResponse.builder()
                .id(favorite.getId())
                .targetType(favorite.getTargetType())
                .targetId(favorite.getTargetId())
                .targetKey(favorite.getTargetKey())
                .label(favorite.getLabel())
                .createdAt(favorite.getCreatedAt())
                .build();
    }
}
