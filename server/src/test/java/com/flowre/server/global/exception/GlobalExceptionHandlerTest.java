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
    void multipartExceptionReturnsDocumentUploadError() {
        MultipartException exception = new MultipartException("upload stream closed");

        ResponseEntity<ApiResponse<Void>> response = handler.handleMultipartException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("DOCUMENT_002");
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
