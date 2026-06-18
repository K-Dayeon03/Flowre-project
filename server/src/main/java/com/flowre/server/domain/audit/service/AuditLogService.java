package com.flowre.server.domain.audit.service;

import com.flowre.server.domain.audit.dto.AuditLogResponse;
import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.entity.AuditLog;
import com.flowre.server.domain.audit.repository.AuditLogRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 감사 로그 기록·조회 서비스.
 *
 * record(...)는 비즈니스 작업의 트랜잭션에 합류해(REQUIRED) 작업과 로그를 원자적으로 남긴다.
 * 조회는 본사·관리자만 가능하며 브랜드 단위로 격리한다.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final int MAX_LIMIT = 200;

    private final AuditLogRepository auditLogRepository;

    /** 감사 로그 한 건을 기록한다. 호출한 비즈니스 트랜잭션에 합류한다. */
    @Transactional
    public void record(User actor, AuditAction action, String targetType, Long targetId, String detail) {
        auditLogRepository.save(AuditLog.builder()
                .brandId(actor.getBrandId())
                .actorId(actor.getId())
                .actorName(actor.getName())
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .detail(detail)
                .build());
    }

    /** 본사·관리자가 브랜드의 감사 로그를 최신순으로 조회한다(선택적 action 필터). */
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getLogs(User user, AuditAction action, int limit) {
        if (!user.getRole().canManage()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(1, limit), MAX_LIMIT));
        List<AuditLog> logs = action != null
                ? auditLogRepository.findByBrandIdAndActionOrderByCreatedAtDesc(user.getBrandId(), action, pageable)
                : auditLogRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId(), pageable);
        return logs.stream().map(AuditLogResponse::from).toList();
    }
}
