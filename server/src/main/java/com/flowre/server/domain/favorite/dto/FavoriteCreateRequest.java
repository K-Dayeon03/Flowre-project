package com.flowre.server.domain.favorite.dto;

import com.flowre.server.domain.favorite.entity.FavoriteTargetType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class FavoriteCreateRequest {

    @NotNull(message = "즐겨찾기 대상을 선택해주세요.")
    private FavoriteTargetType targetType;

    @Positive(message = "즐겨찾기 대상 ID는 1 이상이어야 합니다.")
    private Long targetId;

    @Size(max = 100, message = "즐겨찾기 대상 키는 100자 이하로 입력해주세요.")
    private String targetKey;

    @Size(max = 50, message = "즐겨찾기 이름은 50자 이하로 입력해주세요.")
    private String label;

    @AssertTrue(message = "메뉴 즐겨찾기는 대상 키가, 그 외 즐겨찾기는 대상 ID가 필요합니다.")
    public boolean isValidTargetReference() {
        if (targetType == null) {
            return true;
        }
        if (targetType == FavoriteTargetType.MENU) {
            return targetKey != null && !targetKey.isBlank();
        }
        return targetId != null;
    }
}
