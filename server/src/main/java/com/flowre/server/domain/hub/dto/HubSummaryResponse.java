package com.flowre.server.domain.hub.dto;

import com.flowre.server.domain.document.entity.Document;
import com.flowre.server.domain.notification.dto.NotificationResponse;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class HubSummaryResponse {

    private Long unreadNoticeCount;
    private Long unreadChatCount;
    private Long pendingScheduleCount;
    private Long pendingInquiryCount;
    private Long pendingAsCount;
    private List<NotificationResponse> recentNotifications;
    private List<RecentDocument> recentDocuments;

    @Getter
    @Builder
    public static class RecentDocument {
        private Long id;
        private String title;
        private String category;
        private String createdAt;

        /** 문서 엔티티를 허브 최근 문서 항목으로 변환합니다. */
        public static RecentDocument from(Document document) {
            return RecentDocument.builder()
                    .id(document.getId())
                    .title(document.getTitle())
                    .category(document.getCategory().name())
                    .createdAt(document.getCreatedAt() != null ? document.getCreatedAt().toString() : null)
                    .build();
        }
    }
}

