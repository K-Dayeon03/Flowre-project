package com.flowre.server.global.exception;

import com.flowre.server.global.response.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.multipart.MultipartException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest("POST", "/dummy-s3/documents/test.pdf");
    }

    @Test
    void customUploadExceptionReturnsDocumentUploadError() {
        CustomException exception = new CustomException(ErrorCode.S3_UPLOAD_FAILED, new IOException("disk full"));

        ResponseEntity<ApiResponse<Void>> response = handler.handleCustomException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getError().getCode()).isEqualTo("DOCUMENT_002");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("S3 업로드에 실패했습니다.");
    }

    @Test
    void customInventoryUploadExceptionReturnsDetailedMessage() {
        request = new MockHttpServletRequest("POST", "/api/inventories/upload");
        CustomException exception = new CustomException(
                ErrorCode.INVENTORY_UPLOAD_FAILED,
                "반영할 재고 행을 찾지 못했습니다. 파일의 컬럼 순서와 점별 코드를 확인해주세요."
        );

        ResponseEntity<ApiResponse<Void>> response = handler.handleCustomException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("INVENTORY_004");
        assertThat(response.getBody().getError().getMessage())
                .isEqualTo("반영할 재고 행을 찾지 못했습니다. 파일의 컬럼 순서와 점별 코드를 확인해주세요.");
    }

    @Test
    void multipartExceptionReturnsDocumentUploadError() {
        MultipartException exception = new MultipartException("upload stream closed");

        ResponseEntity<ApiResponse<Void>> response = handler.handleMultipartException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("DOCUMENT_002");
    }

    @Test
    void multipartExceptionForInventoryReturnsInventoryUploadError() {
        request = new MockHttpServletRequest("POST", "/api/inventories/upload");
        MultipartException exception = new MultipartException("upload stream closed");

        ResponseEntity<ApiResponse<Void>> response = handler.handleMultipartException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("INVENTORY_004");
        assertThat(response.getBody().getError().getMessage())
                .isEqualTo("재고 파일 업로드 요청을 처리하지 못했습니다. 파일을 다시 선택해주세요.");
    }

    @Test
    void badRequestExceptionReturnsInvalidInputError() {
        IllegalArgumentException exception = new IllegalArgumentException("Invalid dummy S3 path");

        ResponseEntity<ApiResponse<Void>> response = handler.handleBadRequestException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("COMMON_001");
    }
}
