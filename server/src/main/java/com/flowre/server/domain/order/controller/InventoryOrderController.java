package com.flowre.server.domain.order.controller;

import com.flowre.server.domain.order.dto.OrderCancelRequest;
import com.flowre.server.domain.order.dto.OrderCreateRequest;
import com.flowre.server.domain.order.dto.OrderResponse;
import com.flowre.server.domain.order.dto.OrderStatusUpdateRequest;
import com.flowre.server.domain.order.entity.OrderStatus;
import com.flowre.server.domain.order.service.InventoryOrderService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 모바일 원격 발주 REST API입니다. */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class InventoryOrderController {

    private final InventoryOrderService orderService;

    /** GET /api/orders?storeId=&status=&limit=50 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrders(user, storeId, status, limit)));
    }

    /** GET /api/orders/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrder(user, id)));
    }

    /** POST /api/orders */
    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody OrderCreateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.createOrder(user, request)));
    }

    /** PATCH /api/orders/{id}/status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> changeStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.changeStatus(user, id, request)));
    }

    /** PATCH /api/orders/{id}/cancel */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancel(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody(required = false) OrderCancelRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.cancel(
                user, id, request != null ? request : new OrderCancelRequest())));
    }
}

