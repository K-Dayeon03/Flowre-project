package com.flowre.server.domain.favorite.dto;

import com.flowre.server.domain.favorite.entity.FavoriteTargetType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class FavoriteCreateRequest {

    @NotNull(message = "즐겨찾기 대상을 선택해주세요.")
    private FavoriteTargetType targetType;

    private Long targetId;

    private String targetKey;

    private String label;
}
