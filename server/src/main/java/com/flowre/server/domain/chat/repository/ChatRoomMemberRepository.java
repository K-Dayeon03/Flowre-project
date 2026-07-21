package com.flowre.server.domain.chat.repository;

import com.flowre.server.domain.chat.entity.ChatRoomMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {

    Optional<ChatRoomMember> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    boolean existsByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    boolean existsByChatRoomId(Long chatRoomId);

    void deleteByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    void deleteByChatRoomId(Long chatRoomId);

    /** 사용자의 여러 방 멤버십을 한 번에 조회한다 (채팅방 목록 N+1 제거용). */
    List<ChatRoomMember> findByUserIdAndChatRoom_IdIn(Long userId, List<Long> chatRoomIds);
}
