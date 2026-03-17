package com.flowre.server.domain.chat.repository;

import com.flowre.server.domain.chat.entity.ChatRoomMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {

    Optional<ChatRoomMember> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    boolean existsByChatRoomIdAndUserId(Long chatRoomId, Long userId);
}
