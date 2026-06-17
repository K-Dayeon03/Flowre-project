package com.flowre.server.domain.notice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NoticeCreateRequest {

    @NotBlank(message = "공지 제목을 입력해주세요.")
    private String title;

    private String content;

    private boolean pinned;
}
