package com.flowre.server.domain.schedule.repository;

import com.flowre.server.domain.schedule.entity.Schedule;
import com.flowre.server.domain.schedule.entity.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    List<Schedule> findByBrandIdOrderByCreatedAtDesc(Long brandId);

    List<Schedule> findByBrandIdAndStatusOrderByCreatedAtDesc(Long brandId, ScheduleStatus status);

    List<Schedule> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<Schedule> findByBrandIdAndStoreIdOrderByCreatedAtDesc(Long brandId, Long storeId);

    List<Schedule> findByBrandIdAndStoreIdAndStatusOrderByCreatedAtDesc(Long brandId, Long storeId, ScheduleStatus status);

    Optional<Schedule> findByIdAndBrandId(Long id, Long brandId);

    /** 매장의 특정 기간 내 스케줄 수 (오늘 현황 집계용) */
    long countByStoreIdAndDueDateBetween(Long storeId, LocalDateTime from, LocalDateTime to);

    /** 매장의 특정 기간 내 특정 상태 스케줄 수 */
    long countByStoreIdAndStatusAndDueDateBetween(Long storeId, ScheduleStatus status, LocalDateTime from, LocalDateTime to);
}
