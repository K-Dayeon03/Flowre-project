package com.flowre.server.domain.notice.repository;

import com.flowre.server.domain.notice.entity.NoticeRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NoticeReadRepository extends JpaRepository<NoticeRead, Long> {

    boolean existsByNoticeIdAndUserId(Long noticeId, Long userId);

    long countByUserIdAndNoticeIdIn(Long userId, Collection<Long> noticeIds);

    List<NoticeRead> findByUserIdAndNoticeIdIn(Long userId, Collection<Long> noticeIds);
}
