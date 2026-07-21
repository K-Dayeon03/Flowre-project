package com.flowre.server.domain.chat.repository;

import com.flowre.server.domain.chat.entity.ChatRoom;
import com.flowre.server.domain.chat.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("""
        SELECT DISTINCT r FROM ChatRoom r
        JOIN r.members m
        WHERE m.userId = :userId
          AND r.brandId = :brandId
    """)
    List<ChatRoom> findAllByMemberUserIdAndBrandId(@Param("userId") Long userId,
                                                   @Param("brandId") Long brandId);

    Optional<ChatRoom> findByStoreIdAndType(Long storeId, RoomType type);

    Optional<ChatRoom> findByTypeAndDirectRoomKey(RoomType type, String directRoomKey);

    /** cascade 충돌 없이 채팅방을 직접 삭제 (멤버·메시지가 이미 삭제된 상태에서 호출) */
    @Modifying
    @Query("DELETE FROM ChatRoom r WHERE r.id = :roomId")
    void deleteByIdDirect(@Param("roomId") Long roomId);

    /**
     * 두 사용자 간 기존 DIRECT 채팅방 조회 (중복 생성 방지)
     */
    @Query("""
        SELECT r FROM ChatRoom r
        WHERE r.type = 'DIRECT'
          AND EXISTS (SELECT m FROM r.members m WHERE m.userId = :userId1)
          AND EXISTS (SELECT m FROM r.members m WHERE m.userId = :userId2)
    """)
    Optional<ChatRoom> findDirectRoom(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
}
