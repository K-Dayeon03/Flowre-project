package com.flowre.server.domain.notice.repository;

import com.flowre.server.domain.notice.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    List<Notice> findByBrandIdOrderByPinnedDescCreatedAtDesc(Long brandId);

    Optional<Notice> findByIdAndBrandId(Long id, Long brandId);
}
