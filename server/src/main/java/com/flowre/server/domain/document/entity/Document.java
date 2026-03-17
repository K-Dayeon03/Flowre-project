package com.flowre.server.domain.document.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String s3Key;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentCategory category;

    @Column(nullable = false)
    private Long uploaderId;

    @Column(nullable = false)
    private String uploader;   // 비정규화 — 이름 직접 저장

    @Column(nullable = false)
    private Long brandId;

    private String description;

    private String fileType;   // MIME type (예: application/pdf)

    private Long fileSize;     // bytes

    @CreatedDate
    private LocalDateTime createdAt;
}
