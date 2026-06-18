package com.flowre.server.domain.notification.dto;

import com.flowre.server.domain.notification.entity.Notification;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

    private Long id;
    private String type;
    private String title;
    private String message;
    private String relatedType;
    private Long relatedId;
    private boolean read;
    private String createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType().name())
                .title(n.getTitle())
                .message(n.getMessage())
                .relatedType(n.getRelatedType())
                .relatedId(n.getRelatedId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null)
                .build();
    }
}
