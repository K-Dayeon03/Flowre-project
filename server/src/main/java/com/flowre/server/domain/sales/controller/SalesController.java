package com.flowre.server.domain.sales.controller;

import com.flowre.server.domain.sales.dto.HourlySalesResponse;
import com.flowre.server.domain.sales.dto.SalesSummaryResponse;
import com.flowre.server.domain.sales.dto.SalesUploadResponse;
import com.flowre.server.domain.sales.dto.StoreSalesResponse;
import com.flowre.server.domain.sales.service.SalesService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/** 매출 대시보드 REST API입니다. */
@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SalesController {

    private final SalesService salesService;

    /** GET /api/sales/summary?storeId= */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SalesSummaryResponse>> summary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(salesService.getSummary(user, storeId)));
    }

    /** GET /api/sales/hourly?storeId=&date=2026-08-05 */
    @GetMapping("/hourly")
    public ResponseEntity<ApiResponse<List<HourlySalesResponse>>> hourly(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(salesService.getHourly(user, storeId, date)));
    }

    /** GET /api/sales/stores?date=2026-08-05 */
    @GetMapping("/stores")
    public ResponseEntity<ApiResponse<List<StoreSalesResponse>>> stores(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(salesService.getStoreComparison(user, date)));
    }

    /** POST /api/sales/upload */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SalesUploadResponse>> upload(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(ApiResponse.ok(salesService.upload(user, file)));
    }
}

