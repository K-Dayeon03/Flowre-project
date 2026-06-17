package com.flowre.server.domain.favorite.repository;

import com.flowre.server.domain.favorite.entity.Favorite;
import com.flowre.server.domain.favorite.entity.FavoriteTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Favorite> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndTargetTypeAndTargetIdAndTargetKey(
            Long userId,
            FavoriteTargetType targetType,
            Long targetId,
            String targetKey
    );

    Optional<Favorite> findByUserIdAndTargetTypeAndTargetIdAndTargetKey(
            Long userId,
            FavoriteTargetType targetType,
            Long targetId,
            String targetKey
    );
}
