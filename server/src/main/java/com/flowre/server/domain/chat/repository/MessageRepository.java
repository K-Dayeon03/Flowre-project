package com.flowre.server.domain.chat.repository;

import com.flowre.server.domain.chat.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Optional<Message> findTopByRoomIdOrderBySentAtDesc(Long roomId);

    /**
     * 여러 방의 마지막 메시지(각 방의 최대 id)를 한 번에 조회한다 (채팅방 목록 N+1 제거용).
     */
    @Query("""
        SELECT m FROM Message m
        WHERE m.id IN (
            SELECT MAX(m2.id) FROM Message m2
            WHERE m2.roomId IN :roomIds
            GROUP BY m2.roomId
        )
    """)
    List<Message> findLatestPerRoom(@Param("roomIds") List<Long> roomIds);

    /**
     * 사용자가 속한 여러 방의 안읽음 메시지 수를 방별로 한 번에 집계한다.
     * 멤버의 lastReadAt 이후(또는 미독 시 전체) 메시지를 방 단위로 카운트한다.
     */
    @Query("""
        SELECT msg.roomId AS roomId, COUNT(msg) AS cnt
        FROM ChatRoomMember crm, Message msg
        WHERE crm.userId = :userId
          AND crm.chatRoom.id IN :roomIds
          AND msg.roomId = crm.chatRoom.id
          AND (crm.lastReadAt IS NULL OR msg.sentAt > crm.lastReadAt)
        GROUP BY msg.roomId
    """)
    List<UnreadCount> countUnreadPerRoom(@Param("userId") Long userId, @Param("roomIds") List<Long> roomIds);

    /** countUnreadPerRoom 집계 결과 투영 — 방 id별 안읽음 수. */
    interface UnreadCount {
        Long getRoomId();
        long getCnt();
    }

    long countByRoomId(Long roomId);

    long countByRoomIdAndSentAtAfter(Long roomId, LocalDateTime sentAt);

    void deleteByRoomId(Long roomId);

    // 커서 기반 첫 페이지 — 최신 메시지를 limit개 조회 (커서 키 id와 정렬 키를 일치시켜 누락 방지)
    List<Message> findByRoomIdOrderByIdDesc(Long roomId, Pageable pageable);

    // 커서 기반 페이징 — before(id) 이전 메시지를 id 내림차순으로 limit개 조회
    List<Message> findByRoomIdAndIdLessThanOrderByIdDesc(Long roomId, Long before, Pageable pageable);
}
