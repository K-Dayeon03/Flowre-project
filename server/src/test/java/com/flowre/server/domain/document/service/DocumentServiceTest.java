package com.flowre.server.domain.document.service;

import com.flowre.server.domain.document.dto.DocumentUpdateRequest;
import com.flowre.server.domain.document.entity.Document;
import com.flowre.server.domain.document.entity.DocumentCategory;
import com.flowre.server.domain.document.repository.DocumentRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DocumentServiceTest {

    private DocumentRepository documentRepository;
    private DocumentService documentService;

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        documentService = new DocumentService(documentRepository);
    }

    @Test
    void deleteRemovesOwnedDocument() {
        User user = user(1L);
        Document doc = document(5L, 1L);
        when(documentRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(doc));

        documentService.delete(user, 5L);

        verify(documentRepository).delete(doc);
    }

    @Test
    void deleteFailsForOtherBrandDocument() {
        User user = user(1L);
        // 다른 브랜드 문서는 findByIdAndBrandId에서 걸러져 조회되지 않는다.
        when(documentRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.delete(user, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DOCUMENT_NOT_FOUND);

        verify(documentRepository, never()).delete(any(Document.class));
    }

    @Test
    void updateFailsForOtherBrandDocument() {
        User user = user(1L);
        when(documentRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.update(user, 5L, updateRequest("새 제목", DocumentCategory.NOTICE)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DOCUMENT_NOT_FOUND);
    }

    @Test
    void entityUpdateChangesMetadataButKeepsS3KeyWhenBlank() {
        Document doc = document(5L, 1L);  // s3Key = "documents/orig/file.pdf"

        // s3Key를 비워(null) 보내면 기존 파일 경로를 유지하고 메타데이터만 바꾼다.
        doc.update("수정 제목", DocumentCategory.REPORT, null, "수정 설명", null, null);

        assertThat(doc.getTitle()).isEqualTo("수정 제목");
        assertThat(doc.getCategory()).isEqualTo(DocumentCategory.REPORT);
        assertThat(doc.getDescription()).isEqualTo("수정 설명");
        assertThat(doc.getS3Key()).isEqualTo("documents/orig/file.pdf");
    }

    private DocumentUpdateRequest updateRequest(String title, DocumentCategory category) {
        DocumentUpdateRequest request = new DocumentUpdateRequest();
        ReflectionTestUtils.setField(request, "title", title);
        ReflectionTestUtils.setField(request, "category", category);
        return request;
    }

    private Document document(Long id, Long brandId) {
        return Document.builder()
                .id(id)
                .title("원본 제목")
                .s3Key("documents/orig/file.pdf")
                .category(DocumentCategory.MANUAL)
                .uploaderId(1L)
                .uploader("업로더")
                .brandId(brandId)
                .description("원본 설명")
                .build();
    }

    private User user(Long brandId) {
        return User.builder()
                .id(1L)
                .email("u@jaju.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("사용자")
                .role(UserRole.STORE_MANAGER)
                .brandId(brandId)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
