package com.flowre.server.domain.audit.dto;

import com.flowre.server.domain.audit.entity.AuditLog;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuditLogResponse {

    private Long id;
    private Long actorId;
    private String actorName;
    private String action;
    private String targetType;
    private Long targetId;
    private String detail;
    private String createdAt;

    public static AuditLogResponse from(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActorId())
                .actorName(log.getActorName())
                .action(log.getAction().name())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .detail(log.getDetail())
                .createdAt(log.getCreatedAt() != null ? log.getCreatedAt().toString() : null)
                .build();
    }
}
