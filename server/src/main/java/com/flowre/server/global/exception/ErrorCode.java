package com.flowre.server.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Auth
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "AUTH_001", "점별 코드, 직원 아이디 또는 비밀번호가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_002", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_003", "만료된 토큰입니다."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "AUTH_004", "Refresh Token이 존재하지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_005", "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH_006", "접근 권한이 없습니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_001", "사용자를 찾을 수 없습니다."),
    EMPLOYEE_CODE_ALREADY_EXISTS(HttpStatus.CONFLICT, "USER_002", "이미 등록된 직원 아이디입니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "USER_003", "이미 등록된 이메일입니다."),
    INVALID_EMPLOYEE_CODE(HttpStatus.BAD_REQUEST, "USER_004", "직원 아이디 형식이 올바르지 않거나 점별 코드와 일치하지 않습니다."),
    ACCOUNT_PENDING_APPROVAL(HttpStatus.FORBIDDEN, "USER_005", "점장 승인 대기 중인 계정입니다. 승인 후 로그인할 수 있습니다."),
    ACCOUNT_REJECTED(HttpStatus.FORBIDDEN, "USER_006", "승인이 거절된 계정입니다. 본사에 문의해주세요."),
    APPROVAL_NOT_ALLOWED(HttpStatus.FORBIDDEN, "USER_007", "해당 직원 계정을 승인할 권한이 없습니다."),
    EMPLOYEE_NOT_PENDING(HttpStatus.BAD_REQUEST, "USER_008", "승인 대기 상태의 직원이 아닙니다."),
    STORE_MANAGER_REQUIRED(HttpStatus.BAD_REQUEST, "USER_009", "해당 매장에 점장이 먼저 등록되어 있어야 직원을 등록할 수 있습니다."),

    // Store
    STORE_NOT_FOUND(HttpStatus.NOT_FOUND, "STORE_001", "매장을 찾을 수 없습니다."),
    STORE_ALREADY_EXISTS(HttpStatus.CONFLICT, "STORE_002", "이미 등록된 점별 코드입니다."),

    // Notice
    NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTICE_001", "공지를 찾을 수 없습니다."),

    // Favorite
    FAVORITE_NOT_FOUND(HttpStatus.NOT_FOUND, "FAVORITE_001", "즐겨찾기를 찾을 수 없습니다."),

    // Schedule
    SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND, "SCHEDULE_001", "스케줄을 찾을 수 없습니다."),
    SCHEDULE_ALREADY_DONE(HttpStatus.BAD_REQUEST, "SCHEDULE_002", "이미 완료된 스케줄입니다."),

    // Document
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "DOCUMENT_001", "문서를 찾을 수 없습니다."),
    S3_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "DOCUMENT_002", "S3 업로드에 실패했습니다."),

    // Chat
    CHAT_ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "CHAT_001", "채팅방을 찾을 수 없습니다."),
    DIRECT_ROOM_NOT_ALLOWED(HttpStatus.FORBIDDEN, "CHAT_002", "1:1 채팅방 생성 권한이 없습니다."),
    DIRECT_ROOM_ALREADY_EXISTS(HttpStatus.CONFLICT, "CHAT_003", "이미 존재하는 1:1 채팅방입니다."),

    // Inventory
    INVENTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "INVENTORY_001", "재고를 찾을 수 없습니다."),
    INVENTORY_NOT_ENOUGH(HttpStatus.BAD_REQUEST, "INVENTORY_002", "차감할 재고 수량이 부족합니다."),
    INVENTORY_VERSION_CONFLICT(HttpStatus.CONFLICT, "INVENTORY_003", "재고가 다른 사용자에 의해 변경되었습니다. 새로고침 후 다시 시도해주세요."),

    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_001", "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
