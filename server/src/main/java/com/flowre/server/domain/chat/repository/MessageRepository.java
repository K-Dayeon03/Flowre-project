package com.flowre.server.domain.chat.repository;

import com.flowre.server.domain.chat.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Optional<Message> findTopByRoomIdOrderBySentAtDesc(Long roomId);

    long countByRoomId(Long roomId);

    long countByRoomIdAndSentAtAfter(Long roomId, LocalDateTime sentAt);

    // 커서 기반 첫 페이지 — 최신 메시지를 limit개 조회 (커서 키 id와 정렬 키를 일치시켜 누락 방지)
    List<Message> findByRoomIdOrderByIdDesc(Long roomId, Pageable pageable);

    // 커서 기반 페이징 — before(id) 이전 메시지를 id 내림차순으로 limit개 조회
    List<Message> findByRoomIdAndIdLessThanOrderByIdDesc(Long roomId, Long before, Pageable pageable);
}
