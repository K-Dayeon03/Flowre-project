package com.flowre.server.domain.document.dto;

import com.flowre.server.domain.document.entity.DocumentCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class DocumentCreateRequest {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotNull(message = "카테고리를 선택해주세요.")
    private DocumentCategory category;

    @NotBlank(message = "S3 키를 입력해주세요.")
    private String s3Key;

    private String description;
    private String fileType;
    private Long fileSize;
}
