package com.flowre.server.domain.order.service;

import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InventoryOrderServiceTest {

    private InventoryOrderRepository orderRepository;
    private InventoryItemRepository inventoryItemRepository;
    private AuditLogService auditLogService;
    private InventoryOrderService orderService;

    @BeforeEach
    void setUp() {
        orderRepository = mock(InventoryOrderRepository.class);
        inventoryItemRepository = mock(InventoryItemRepository.class);
        auditLogService = mock(AuditLogService.class);
        orderService = new InventoryOrderService(orderRepository, inventoryItemRepository, auditLogService);
    }

    @Test
    void createOrderUsesInventoryPriceAndExpectedAmount() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        InventoryItem item = inventoryItem(7L, 1001L, 3, 5, 29900);
        when(inventoryItemRepository.findByIdAndBrandId(7L, 1L)).thenReturn(Optional.of(item));
        when(orderRepository.save(any(InventoryOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse result = orderService.createOrder(user, createRequest(7L, 4, null));

        assertThat(result.getInventoryItemId()).isEqualTo(7L);
        assertThat(result.getOrderQuantity()).isEqualTo(4);
        assertThat(result.getUnitPrice()).isEqualTo(29900);
        assertThat(result.getExpectedAmount()).isEqualTo(119600);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PREPARING.name());
        verify(auditLogService).record(eq(user), any(), eq("INVENTORY_ORDER"), any(), contains("4개 발주 요청"));
    }

    @Test
    void createOrderFailsWhenStoreStaffOrdersOtherStoreItem() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        InventoryItem item = inventoryItem(7L, 2002L, 3, 5, 29900);
        when(inventoryItemRepository.findByIdAndBrandId(7L, 1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> orderService.createOrder(user, createRequest(7L, 4, null)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_FORBIDDEN);

        verify(orderRepository, never()).save(any());
    }

    @Test
    void storeManagerCanChangeOwnStoreOrderStatus() {
        User user = user(UserRole.STORE_MANAGER, 1001L);
        InventoryOrder order = order(10L, 1001L);
        when(orderRepository.findByIdAndBrandId(10L, 1L)).thenReturn(Optional.of(order));

        OrderResponse result = orderService.changeStatus(user, 10L, statusRequest(OrderStatus.SHIPPING));

        assertThat(result.getStatus()).isEqualTo(OrderStatus.SHIPPING.name());
    }

    @Test
    void storeStaffCannotChangeOrderStatus() {
        User user = user(UserRole.STORE_STAFF, 1001L);
        InventoryOrder order = order(10L, 1001L);
        when(orderRepository.findByIdAndBrandId(10L, 1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.changeStatus(user, 10L, statusRequest(OrderStatus.SHIPPING)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_FORBIDDEN);
    }

    private OrderCreateRequest createRequest(Long inventoryItemId, int quantity, Integer unitPrice) {
        OrderCreateRequest request = new OrderCreateRequest();
        ReflectionTestUtils.setField(request, "inventoryItemId", inventoryItemId);
        ReflectionTestUtils.setField(request, "orderQuantity", quantity);
        ReflectionTestUtils.setField(request, "unitPrice", unitPrice);
        return request;
    }

    private OrderStatusUpdateRequest statusRequest(OrderStatus status) {
        OrderStatusUpdateRequest request = new OrderStatusUpdateRequest();
        ReflectionTestUtils.setField(request, "status", status);
        return request;
    }

    private InventoryItem inventoryItem(Long id, Long storeId, int quantity, int minQuantity, int retailPrice) {
        return InventoryItem.builder()
                .id(id)
                .brandId(1L)
                .storeId(storeId)
                .storeCode(String.valueOf(storeId))
                .storeName("강남점")
                .productCode("SKU-001")
                .productName("테스트 상품")
                .quantity(quantity)
                .minQuantity(minQuantity)
                .retailPrice(retailPrice)
                .build();
    }

    private InventoryOrder order(Long id, Long storeId) {
        return InventoryOrder.builder()
                .id(id)
                .brandId(1L)
                .storeId(storeId)
                .storeName("강남점")
                .inventoryItemId(7L)
                .productCode("SKU-001")
                .productName("테스트 상품")
                .currentQuantity(3)
                .minQuantity(5)
                .orderQuantity(4)
                .unitPrice(29900)
                .expectedAmount(119600)
                .status(OrderStatus.PREPARING)
                .requestedById(20L)
                .requestedByName("매장 직원")
                .build();
    }

    private User user(UserRole role, Long storeId) {
        return User.builder()
                .id(20L)
                .email("user@flowre.com")
                .employeeCode(storeId + "USER!")
                .password("encoded")
                .name("사용자")
                .role(role)
                .brandId(1L)
                .storeId(storeId)
                .storeCode(String.valueOf(storeId))
                .storeName("강남점")
                .build();
    }
}

