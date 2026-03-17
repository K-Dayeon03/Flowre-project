package com.flowre.server.domain.schedule.repository;

import com.flowre.server.domain.schedule.entity.Schedule;
import com.flowre.server.domain.schedule.entity.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    List<Schedule> findByBrandIdOrderByCreatedAtDesc(Long brandId);

    List<Schedule> findByBrandIdAndStatusOrderByCreatedAtDesc(Long brandId, ScheduleStatus status);

    List<Schedule> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    Optional<Schedule> findByIdAndBrandId(Long id, Long brandId);
}
