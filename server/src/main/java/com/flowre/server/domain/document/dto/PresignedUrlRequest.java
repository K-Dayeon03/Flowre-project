package com.flowre.server.domain.document.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class PresignedUrlRequest {

    @NotBlank(message = "파일명을 입력해주세요.")
    private String fileName;

    @NotBlank(message = "파일 타입을 입력해주세요.")
    private String contentType;
}
