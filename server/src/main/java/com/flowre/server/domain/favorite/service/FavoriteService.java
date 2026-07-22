package com.flowre.server.domain.favorite.service;

import com.flowre.server.domain.favorite.dto.FavoriteCreateRequest;
import com.flowre.server.domain.favorite.dto.FavoriteResponse;
import com.flowre.server.domain.favorite.entity.Favorite;
import com.flowre.server.domain.favorite.repository.FavoriteRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;

    /**
     * 인증 사용자의 즐겨찾기 목록을 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<FavoriteResponse> getFavorites(User user) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(FavoriteResponse::from)
                .toList();
    }

    /**
     * 인증 사용자의 즐겨찾기를 추가합니다. 같은 대상이 이미 있으면 기존 항목을 반환합니다.
     */
    @Transactional
    public FavoriteResponse add(User user, FavoriteCreateRequest request) {
        String targetKey = normalizeNullable(request.getTargetKey());
        return favoriteRepository.findByUserIdAndTargetTypeAndTargetIdAndTargetKey(
                        user.getId(),
                        request.getTargetType(),
                        request.getTargetId(),
                        targetKey
                )
                .map(FavoriteResponse::from)
                .orElseGet(() -> createFavorite(user, request, targetKey));
    }

    /**
     * 인증 사용자 소유의 즐겨찾기를 삭제합니다.
     */
    @Transactional
    public void remove(User user, Long id) {
        Favorite favorite = favoriteRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.FAVORITE_NOT_FOUND));
        favoriteRepository.delete(favorite);
        log.info("[Favorite] deleted id={} userId={}", id, user.getId());
    }

    private FavoriteResponse createFavorite(User user, FavoriteCreateRequest request, String targetKey) {
        Favorite favorite = Favorite.builder()
                .userId(user.getId())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .targetKey(targetKey)
                .label(normalizeNullable(request.getLabel()))
                .build();
        Favorite saved = favoriteRepository.save(favorite);
        log.info("[Favorite] created id={} userId={} targetType={}",
                saved.getId(), saved.getUserId(), saved.getTargetType());
        return FavoriteResponse.from(saved);
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
