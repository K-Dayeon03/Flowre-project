package com.flowre.server.domain.order.service;

import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.order.dto.OrderCancelRequest;
import com.flowre.server.domain.order.dto.OrderCreateRequest;
import com.flowre.server.domain.order.dto.OrderResponse;
import com.flowre.server.domain.order.dto.OrderStatusUpdateRequest;
import com.flowre.server.domain.order.entity.InventoryOrder;
import com.flowre.server.domain.order.entity.OrderStatus;
import com.flowre.server.domain.order.repository.InventoryOrderRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/** 모바일 원격 발주 생성·조회·상태 변경 서비스입니다. */
@Service
@RequiredArgsConstructor
public class InventoryOrderService {

    private static final int MAX_LIMIT = 100;

    private final InventoryOrderRepository orderRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final AuditLogService auditLogService;

    /** 발주 목록을 역할별 매장 범위로 조회합니다. */
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(User user, Long storeId, OrderStatus status, int limit) {
        Long effectiveStoreId = user.getRole().canViewAllStores() ? storeId : user.getStoreId();
        PageRequest pageable = PageRequest.of(0, clampLimit(limit));
        List<InventoryOrder> orders;
        if (effectiveStoreId != null && status != null) {
            orders = orderRepository.findByBrandIdAndStoreIdAndStatusOrderByCreatedAtDesc(
                    user.getBrandId(), effectiveStoreId, status, pageable);
        } else if (effectiveStoreId != null) {
            orders = orderRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(
                    user.getBrandId(), effectiveStoreId, pageable);
        } else if (status != null) {
            orders = orderRepository.findByBrandIdAndStatusOrderByCreatedAtDesc(
                    user.getBrandId(), status, pageable);
        } else {
            orders = orderRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId(), pageable);
        }
        return orders.stream().map(OrderResponse::from).toList();
    }

    /** 발주 상세를 조회합니다. */
    @Transactional(readOnly = true)
    public OrderResponse getOrder(User user, Long id) {
        InventoryOrder order = getVisibleOrder(user, id);
        return OrderResponse.from(order);
    }

    /** 재고 항목을 기준으로 새 발주를 생성합니다. */
    @Transactional
    public OrderResponse createOrder(User user, OrderCreateRequest request) {
        InventoryItem item = inventoryItemRepository.findByIdAndBrandId(
                        request.getInventoryItemId(), user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVENTORY_NOT_FOUND));
        assertStoreVisible(user, item.getStoreId());

        int unitPrice = resolveUnitPrice(item, request.getUnitPrice());
        int expectedAmount = unitPrice * request.getOrderQuantity();
        InventoryOrder order = InventoryOrder.builder()
                .brandId(user.getBrandId())
                .storeId(item.getStoreId())
                .storeName(item.getStoreName())
                .inventoryItemId(item.getId())
                .productCode(item.getProductCode())
                .productName(item.getProductName())
                .currentQuantity(item.getQuantity())
                .minQuantity(item.getEffectiveMinQuantity())
                .orderQuantity(request.getOrderQuantity())
                .unitPrice(unitPrice)
                .expectedAmount(expectedAmount)
                .status(OrderStatus.PREPARING)
                .requestedById(user.getId())
                .requestedByName(user.getName())
                .build();

        InventoryOrder saved = orderRepository.save(order);
        auditLogService.record(user, AuditAction.ORDER_CREATED, "INVENTORY_ORDER", saved.getId(),
                saved.getProductName() + " " + saved.getOrderQuantity() + "개 발주 요청");
        return OrderResponse.from(saved);
    }

    /** 점장·본사가 발주 진행 상태를 변경합니다. */
    @Transactional
    public OrderResponse changeStatus(User user, Long id, OrderStatusUpdateRequest request) {
        InventoryOrder order = getVisibleOrder(user, id);
        assertCanManageOrder(user, order.getStoreId());
        if (request.getStatus() == OrderStatus.CANCELED) {
            order.cancel(order.getCanceledReason());
        } else {
            order.changeStatus(request.getStatus());
        }
        auditLogService.record(user, AuditAction.ORDER_STATUS_CHANGED, "INVENTORY_ORDER", order.getId(),
                order.getProductName() + " 발주 상태 변경: " + order.getStatus().name());
        return OrderResponse.from(order);
    }

    /** 점장·본사가 발주를 취소합니다. */
    @Transactional
    public OrderResponse cancel(User user, Long id, OrderCancelRequest request) {
        InventoryOrder order = getVisibleOrder(user, id);
        assertCanManageOrder(user, order.getStoreId());
        String reason = StringUtils.hasText(request.getReason()) ? request.getReason().trim() : null;
        order.cancel(reason);
        auditLogService.record(user, AuditAction.ORDER_CANCELED, "INVENTORY_ORDER", order.getId(),
                order.getProductName() + " 발주 취소" + (reason != null ? " - " + reason : ""));
        return OrderResponse.from(order);
    }

    private InventoryOrder getVisibleOrder(User user, Long id) {
        InventoryOrder order = orderRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.ORDER_NOT_FOUND));
        assertStoreVisible(user, order.getStoreId());
        return order;
    }

    private void assertStoreVisible(User user, Long storeId) {
        if (!user.getRole().canViewAllStores() && !user.getStoreId().equals(storeId)) {
            throw new CustomException(ErrorCode.ORDER_FORBIDDEN);
        }
    }

    private void assertCanManageOrder(User user, Long storeId) {
        if (user.getRole().isHeadquarters()) {
            return;
        }
        if (user.getRole() == UserRole.STORE_MANAGER && user.getStoreId().equals(storeId)) {
            return;
        }
        throw new CustomException(ErrorCode.ORDER_FORBIDDEN);
    }

    private int resolveUnitPrice(InventoryItem item, Integer requestedUnitPrice) {
        if (requestedUnitPrice != null) {
            return requestedUnitPrice;
        }
        if (item.getRetailPrice() != null) {
            return item.getRetailPrice();
        }
        if (item.getNormalPrice() != null) {
            return item.getNormalPrice();
        }
        return 0;
    }

    private int clampLimit(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }
}
