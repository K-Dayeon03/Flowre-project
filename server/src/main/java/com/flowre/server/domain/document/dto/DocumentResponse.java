package com.flowre.server.domain.document.dto;

import com.flowre.server.domain.document.entity.Document;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DocumentResponse {

    private Long id;
    private String title;
    private String category;
    private String fileType;
    private String size;       // 사람이 읽기 좋은 포맷 (예: "2.3 MB")
    private String s3Url;      // CloudFront 또는 S3 공개 URL
    private String uploader;
    private Long brandId;
    private String description;
    private String createdAt;

    public static DocumentResponse from(Document d, String s3BaseUrl) {
        return DocumentResponse.builder()
                .id(d.getId())
                .title(d.getTitle())
                .category(d.getCategory().name())
                .fileType(d.getFileType())
                .size(formatSize(d.getFileSize()))
                .s3Url(s3BaseUrl + "/" + d.getS3Key())
                .uploader(d.getUploader())
                .brandId(d.getBrandId())
                .description(d.getDescription())
                .createdAt(d.getCreatedAt() != null ? d.getCreatedAt().toString() : null)
                .build();
    }

    private static String formatSize(Long bytes) {
        if (bytes == null) return "-";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        return String.format("%.1f MB", bytes / (1024.0 * 1024));
    }
}
