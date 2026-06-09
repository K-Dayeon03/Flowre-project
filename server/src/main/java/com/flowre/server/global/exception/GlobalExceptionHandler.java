package com.flowre.server.global.exception;

import com.flowre.server.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException e, HttpServletRequest request) {
        ErrorCode code = e.getErrorCode();
        logByStatus(code.getStatus(), "[CustomException] {} {} {} - {}",
                request.getMethod(), request.getRequestURI(), code.getCode(), code.getMessage(), e);
        return fail(code, code.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException e,
            HttpServletRequest request
    ) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.warn("[ValidationException] {} {} - {}", request.getMethod(), request.getRequestURI(), message);
        return fail(ErrorCode.INVALID_INPUT, message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
            ConstraintViolationException e,
            HttpServletRequest request
    ) {
        String message = e.getConstraintViolations().stream()
                .map(violation -> violation.getMessage())
                .collect(Collectors.joining(", "));
        log.warn("[ConstraintViolationException] {} {} - {}", request.getMethod(), request.getRequestURI(), message);
        return fail(ErrorCode.INVALID_INPUT, message);
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequestException(Exception e, HttpServletRequest request) {
        log.warn("[BadRequestException] {} {} - {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        return fail(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage());
    }

    @ExceptionHandler({MultipartException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<ApiResponse<Void>> handleMultipartException(Exception e, HttpServletRequest request) {
        log.error("[MultipartException] {} {} - {}", request.getMethod(), request.getRequestURI(), e.getMessage(), e);
        return fail(ErrorCode.S3_UPLOAD_FAILED, ErrorCode.S3_UPLOAD_FAILED.getMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(
            AuthenticationException e,
            HttpServletRequest request
    ) {
        log.warn("[AuthenticationException] {} {} - {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        return fail(ErrorCode.UNAUTHORIZED, ErrorCode.UNAUTHORIZED.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(
            AccessDeniedException e,
            HttpServletRequest request
    ) {
        log.warn("[AccessDeniedException] {} {} - {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        return fail(ErrorCode.FORBIDDEN, ErrorCode.FORBIDDEN.getMessage());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowedException(
            HttpRequestMethodNotSupportedException e,
            HttpServletRequest request
    ) {
        log.warn("[MethodNotAllowedException] {} {} - {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT.getCode(), "지원하지 않는 요청 방식입니다."));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataAccessException(DataAccessException e, HttpServletRequest request) {
        log.error("[DataAccessException] {} {}", request.getMethod(), request.getRequestURI(), e);
        return fail(ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e, HttpServletRequest request) {
        log.error("[UnhandledException] {} {}", request.getMethod(), request.getRequestURI(), e);
        ErrorCode code = ErrorCode.INTERNAL_SERVER_ERROR;
        return ResponseEntity
                .status(code.getStatus())
                .body(ApiResponse.fail(code.getCode(), code.getMessage()));
    }

    private ResponseEntity<ApiResponse<Void>> fail(ErrorCode code, String message) {
        return ResponseEntity
                .status(code.getStatus())
                .body(ApiResponse.fail(code.getCode(), message));
    }

    private void logByStatus(HttpStatus status, String message, Object... args) {
        if (status.is5xxServerError()) {
            log.error(message, args);
            return;
        }
        log.warn(message, args);
    }
}
