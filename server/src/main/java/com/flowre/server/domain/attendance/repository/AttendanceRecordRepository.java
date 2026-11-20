package com.flowre.server.domain.attendance.repository;

import com.flowre.server.domain.attendance.entity.AttendanceRecord;
import com.flowre.server.domain.attendance.entity.AttendanceStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    Optional<AttendanceRecord> findByIdAndBrandId(Long id, Long brandId);

    Optional<AttendanceRecord> findByBrandIdAndUserIdAndWorkDateAndStatus(
            Long brandId,
            Long userId,
            LocalDate workDate,
            AttendanceStatus status
    );

    boolean existsByBrandIdAndUserIdAndWorkDateAndStatus(
            Long brandId,
            Long userId,
            LocalDate workDate,
            AttendanceStatus status
    );

    List<AttendanceRecord> findByBrandIdAndUserIdOrderByWorkDateDescCreatedAtDesc(
            Long brandId,
            Long userId,
            Pageable pageable
    );

    List<AttendanceRecord> findByBrandIdAndWorkDateOrderByCreatedAtDesc(Long brandId, LocalDate workDate, Pageable pageable);

    List<AttendanceRecord> findByBrandIdAndStoreIdAndWorkDateOrderByCreatedAtDesc(
            Long brandId,
            Long storeId,
            LocalDate workDate,
            Pageable pageable
    );
}

