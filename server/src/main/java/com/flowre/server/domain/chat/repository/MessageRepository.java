package com.flowre.server.domain.chat.repository;

import com.flowre.server.domain.chat.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByRoomIdOrderBySentAtAsc(Long roomId);

    // 커서 기반 페이징 — before 이전 메시지를 최신순으로 limit개 조회
    List<Message> findByRoomIdAndIdLessThanOrderBySentAtDesc(Long roomId, Long before, Pageable pageable);
}
