package com.flowre.server.domain.document.service;

import com.flowre.server.domain.document.dto.DocumentCreateRequest;
import com.flowre.server.domain.document.dto.DocumentResponse;
import com.flowre.server.domain.document.dto.PresignedUrlRequest;
import com.flowre.server.domain.document.dto.PresignedUrlResponse;
import com.flowre.server.domain.document.entity.Document;
import com.flowre.server.domain.document.entity.DocumentCategory;
import com.flowre.server.domain.document.repository.DocumentRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;

    // TODO: S3 연동 시 주입
    // private final S3Presigner s3Presigner;

    private static final String DUMMY_BASE_URL = "http://localhost:8080/dummy-s3";

    /**
     * Presigned URL 더미 발급 — S3 연동 전 로컬 개발용
     */
    public PresignedUrlResponse getPresignedUrl(PresignedUrlRequest request) {
        String s3Key = "documents/" + UUID.randomUUID() + "/" + request.getFileName();
        String dummyUrl = DUMMY_BASE_URL + "/" + s3Key;
        return new PresignedUrlResponse(dummyUrl, s3Key);
    }

    /**
     * 문서 목록 조회 — brandId 격리
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> getList(User user, DocumentCategory category) {
        List<Document> docs = category != null
                ? documentRepository.findByBrandIdAndCategoryOrderByCreatedAtDesc(user.getBrandId(), category)
                : documentRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId());

        return docs.stream().map(d -> DocumentResponse.from(d, DUMMY_BASE_URL)).toList();
    }

    /**
     * 문서 단건 조회
     */
    @Transactional(readOnly = true)
    public DocumentResponse getById(User user, Long id) {
        Document doc = documentRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.DOCUMENT_NOT_FOUND));
        return DocumentResponse.from(doc, DUMMY_BASE_URL);
    }

    /**
     * S3 업로드 완료 후 메타데이터 저장
     */
    @Transactional
    public DocumentResponse create(User user, DocumentCreateRequest request) {
        Document doc = Document.builder()
                .title(request.getTitle())
                .category(request.getCategory())
                .s3Key(request.getS3Key())
                .description(request.getDescription())
                .fileType(request.getFileType())
                .fileSize(request.getFileSize())
                .uploaderId(user.getId())
                .uploader(user.getName())
                .brandId(user.getBrandId())
                .build();

        return DocumentResponse.from(documentRepository.save(doc), DUMMY_BASE_URL);
    }

    /**
     * 문서 삭제
     */
    @Transactional
    public void delete(User user, Long id) {
        Document doc = documentRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.DOCUMENT_NOT_FOUND));
        documentRepository.delete(doc);
    }
}
