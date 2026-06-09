package com.flowre.server.domain.inventory.controller;

import com.flowre.server.domain.inventory.dto.*;
import com.flowre.server.domain.inventory.service.InventoryService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/inventories")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    /** GET /api/inventories?query=&storeId=&archived=&labelName= */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryResponse>>> search(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean archived,
            @RequestParam(required = false) String labelName
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.search(user, storeId, query, archived, labelName)));
    }

    /** GET /api/inventories/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryResponse>> getById(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getById(user, id)));
    }

    /** GET /api/inventories/labels */
    @GetMapping("/labels")
    public ResponseEntity<ApiResponse<List<InventoryLabelResponse>>> getLabels(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLabels(user)));
    }

    /** POST /api/inventories/labels */
    @PostMapping("/labels")
    public ResponseEntity<ApiResponse<InventoryLabelResponse>> createLabel(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody InventoryLabelRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.createLabel(user, request)));
    }

    /** PATCH /api/inventories/{id}/archive */
    @PatchMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<InventoryResponse>> archive(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody InventoryArchiveRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.archive(user, id, request)));
    }

    /** PATCH /api/inventories/{id}/unarchive */
    @PatchMapping("/{id}/unarchive")
    public ResponseEntity<ApiResponse<InventoryResponse>> unarchive(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.unarchive(user, id)));
    }

    /** POST /api/inventories/{id}/deduct */
    @PostMapping("/{id}/deduct")
    public ResponseEntity<ApiResponse<InventoryResponse>> deduct(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody InventoryDeductRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.deduct(user, id, request)));
    }

    /** PATCH /api/inventories/{id}/adjust */
    @PatchMapping("/{id}/adjust")
    public ResponseEntity<ApiResponse<InventoryResponse>> adjust(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody InventoryAdjustRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.adjust(user, id, request)));
    }

    /** GET /api/inventories/transactions */
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<InventoryTransactionResponse>>> getTransactions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getTransactions(user)));
    }

    /** POST /api/inventories/reload */
    @PostMapping("/reload")
    public ResponseEntity<ApiResponse<InventoryLoadResponse>> reload(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.reloadFromDataDirectory(user)));
    }

    /** POST /api/inventories/upload */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<InventoryLoadResponse>> upload(
            @AuthenticationPrincipal User user,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.uploadDailyInventory(user, file)));
    }
}
