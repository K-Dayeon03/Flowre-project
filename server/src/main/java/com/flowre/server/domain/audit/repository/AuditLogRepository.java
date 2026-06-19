package com.flowre.server.domain.audit.repository;

import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByBrandIdOrderByCreatedAtDesc(Long brandId, Pageable pageable);

    List<AuditLog> findByBrandIdAndActionOrderByCreatedAtDesc(Long brandId, AuditAction action, Pageable pageable);
}
