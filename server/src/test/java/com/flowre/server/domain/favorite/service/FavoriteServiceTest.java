package com.flowre.server.domain.favorite.service;

import com.flowre.server.domain.favorite.dto.FavoriteCreateRequest;
import com.flowre.server.domain.favorite.dto.FavoriteResponse;
import com.flowre.server.domain.favorite.entity.Favorite;
import com.flowre.server.domain.favorite.entity.FavoriteTargetType;
import com.flowre.server.domain.favorite.repository.FavoriteRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FavoriteServiceTest {

    private FavoriteRepository favoriteRepository;
    private FavoriteService favoriteService;

    @BeforeEach
    void setUp() {
        favoriteRepository = mock(FavoriteRepository.class);
        favoriteService = new FavoriteService(favoriteRepository);
    }

    @Test
    void getFavoritesUsesAuthenticatedUserId() {
        Favorite favorite = favorite(1L, 10L, FavoriteTargetType.MENU, null, "schedule", "스케줄");
        when(favoriteRepository.findByUserIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(favorite));

        List<FavoriteResponse> responses = favoriteService.getFavorites(user(10L));

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getTargetKey()).isEqualTo("schedule");
        verify(favoriteRepository).findByUserIdOrderByCreatedAtDesc(10L);
    }

    @Test
    void addReturnsExistingFavoriteWhenDuplicateTargetExists() {
        FavoriteCreateRequest request = favoriteCreateRequest(FavoriteTargetType.DOCUMENT, 7L, null, "문서");
        Favorite existing = favorite(1L, 10L, FavoriteTargetType.DOCUMENT, 7L, null, "문서");

        when(favoriteRepository.findByUserIdAndTargetTypeAndTargetIdAndTargetKey(
                10L, FavoriteTargetType.DOCUMENT, 7L, null
        )).thenReturn(Optional.of(existing));

        FavoriteResponse response = favoriteService.add(user(10L), request);

        assertThat(response.getId()).isEqualTo(1L);
        verify(favoriteRepository, never()).save(any(Favorite.class));
    }

    @Test
    void addStoresAuthenticatedUserId() {
        FavoriteCreateRequest request = favoriteCreateRequest(FavoriteTargetType.MENU, null, "chat", "채팅");
        when(favoriteRepository.findByUserIdAndTargetTypeAndTargetIdAndTargetKey(
                10L, FavoriteTargetType.MENU, null, "chat"
        )).thenReturn(Optional.empty());
        when(favoriteRepository.save(any(Favorite.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FavoriteResponse response = favoriteService.add(user(10L), request);

        assertThat(response.getTargetKey()).isEqualTo("chat");
        verify(favoriteRepository).save(argThat(favorite ->
                favorite.getUserId().equals(10L)
                        && favorite.getTargetType() == FavoriteTargetType.MENU
                        && "chat".equals(favorite.getTargetKey())
        ));
    }

    @Test
    void removeVerifiesOwnerBeforeDeleting() {
        Favorite favorite = favorite(1L, 10L, FavoriteTargetType.SCHEDULE, 3L, null, "스케줄");
        when(favoriteRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(favorite));

        favoriteService.remove(user(10L), 1L);

        verify(favoriteRepository).delete(favorite);
    }

    @Test
    void removeFailsWhenFavoriteDoesNotBelongToUser() {
        when(favoriteRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> favoriteService.remove(user(10L), 1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FAVORITE_NOT_FOUND);
    }

    private FavoriteCreateRequest favoriteCreateRequest(
            FavoriteTargetType targetType,
            Long targetId,
            String targetKey,
            String label
    ) {
        FavoriteCreateRequest request = new FavoriteCreateRequest();
        ReflectionTestUtils.setField(request, "targetType", targetType);
        ReflectionTestUtils.setField(request, "targetId", targetId);
        ReflectionTestUtils.setField(request, "targetKey", targetKey);
        ReflectionTestUtils.setField(request, "label", label);
        return request;
    }

    private Favorite favorite(
            Long id,
            Long userId,
            FavoriteTargetType targetType,
            Long targetId,
            String targetKey,
            String label
    ) {
        return Favorite.builder()
                .id(id)
                .userId(userId)
                .targetType(targetType)
                .targetId(targetId)
                .targetKey(targetKey)
                .label(label)
                .build();
    }

    private User user(Long id) {
        return User.builder()
                .id(id)
                .email("user@flowre.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("테스트 사용자")
                .role(UserRole.STORE_STAFF)
                .brandId(1L)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
