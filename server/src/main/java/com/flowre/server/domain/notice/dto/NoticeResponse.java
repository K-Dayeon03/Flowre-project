package com.flowre.server.domain.notice.dto;

import com.flowre.server.domain.notice.entity.Notice;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NoticeResponse {

    private Long id;
    private String title;
    private String content;
    private boolean pinned;
    private String authorName;
    private boolean read;
    private LocalDateTime createdAt;

    /** 공지 엔티티를 읽음 여부가 포함된 응답 DTO로 변환합니다. */
    public static NoticeResponse from(Notice notice, boolean read) {
        return NoticeResponse.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .content(notice.getContent())
                .pinned(notice.isPinned())
                .authorName(notice.getAuthorName())
                .read(read)
                .createdAt(notice.getCreatedAt())
                .build();
    }
}
