package com.flowre.server.domain.document.controller;

import com.flowre.server.domain.document.dto.DocumentCreateRequest;
import com.flowre.server.domain.document.dto.DocumentResponse;
import com.flowre.server.domain.document.dto.PresignedUrlRequest;
import com.flowre.server.domain.document.dto.PresignedUrlResponse;
import com.flowre.server.domain.document.entity.DocumentCategory;
import com.flowre.server.domain.document.service.DocumentService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /** GET /api/documents?category=MANUAL */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getList(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) DocumentCategory category
    ) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getList(user, category)));
    }

    /** GET /api/documents/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getById(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getById(user, id)));
    }

    /** POST /api/documents/presigned-url */
    @PostMapping("/presigned-url")
    public ResponseEntity<ApiResponse<PresignedUrlResponse>> getPresignedUrl(
            @Valid @RequestBody PresignedUrlRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getPresignedUrl(request)));
    }

    /** POST /api/documents — S3 업로드 완료 후 메타데이터 등록 */
    @PostMapping
    public ResponseEntity<ApiResponse<DocumentResponse>> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DocumentCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.create(user, request)));
    }

    /** DELETE /api/documents/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        documentService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
