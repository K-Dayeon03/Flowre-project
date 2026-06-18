package com.flowre.server.domain.document.controller;

import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.URI;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * S3 연동 전 로컬·개발 환경에서만 동작하는 더미 파일 서버.
 *
 * 운영(prod) 프로파일에서는 빈으로 등록되지 않아(@Profile("!prod")) 무인증 파일 업로드/다운로드가
 * 노출되지 않는다. 운영에서는 실제 S3 Presigned URL로 대체된다.
 */
@Slf4j
@Profile("!prod")
@RestController
@RequestMapping("/dummy-s3")
public class DummyS3Controller {

    private static final Path ROOT = Path.of(System.getProperty("java.io.tmpdir"), "flowre-dummy-s3")
            .toAbsolutePath()
            .normalize();

    /** 로컬 개발용 presigned URL PUT 업로드를 받아 임시 폴더에 저장합니다. */
    @PutMapping("/**")
    public ResponseEntity<Void> upload(HttpServletRequest request, InputStream inputStream) {
        Path target = resolvePath(request);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            log.info("[DummyS3] uploaded {}", target);
        } catch (IOException e) {
            log.error("[DummyS3] upload failed target={}", target, e);
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED, e);
        }
        return ResponseEntity.ok().build();
    }

    /** 로컬 개발용 미리보기/다운로드 파일을 반환합니다. */
    @GetMapping("/**")
    public ResponseEntity<Resource> download(HttpServletRequest request) {
        Path target = resolvePath(request);
        if (!Files.exists(target)) {
            return ResponseEntity.notFound().build();
        }
        try {
            Resource resource = new UrlResource(target.toUri());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
        } catch (Exception e) {
            log.error("[DummyS3] download failed target={}", target, e);
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED, e);
        }
    }

    private Path resolvePath(HttpServletRequest request) {
        String prefix = "/dummy-s3/";
        String uri = URI.create(request.getRequestURI()).normalize().getPath();
        String relative = uri.startsWith(prefix) ? uri.substring(prefix.length()) : "";
        Path target = ROOT.resolve(relative).normalize();
        if (!target.startsWith(ROOT)) {
            throw new IllegalArgumentException("Invalid dummy S3 path");
        }
        return target;
    }
}
