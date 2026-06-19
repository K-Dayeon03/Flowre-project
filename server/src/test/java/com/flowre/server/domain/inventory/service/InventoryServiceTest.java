package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.inventory.dto.InventoryTransactionResponse;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryTransaction;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.inventory.repository.InventoryTransactionRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class InventoryServiceTest {

    private InventoryItemRepository inventoryItemRepository;
    private InventoryLabelRepository inventoryLabelRepository;
    private InventoryTransactionRepository inventoryTransactionRepository;
    private InventoryExcelLoader inventoryExcelLoader;
    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        inventoryItemRepository = mock(InventoryItemRepository.class);
        inventoryLabelRepository = mock(InventoryLabelRepository.class);
        inventoryTransactionRepository = mock(InventoryTransactionRepository.class);
        inventoryExcelLoader = mock(InventoryExcelLoader.class);
        inventoryService = new InventoryService(
                inventoryItemRepository,
                inventoryLabelRepository,
                inventoryTransactionRepository,
                inventoryExcelLoader,
                mock(AuditLogService.class)
        );
    }

    @Test
    void getItemTransactionsReturnsHistoryForOwnedItem() {
        User user = storeStaff(10L, 1L, 1001L);
        InventoryItem item = item(5L, 1L, 1001L);
        when(inventoryItemRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(1L, 5L))
                .thenReturn(List.of(transaction(100L, 1L, 1001L, 5L), transaction(99L, 1L, 1001L, 5L)));

        List<InventoryTransactionResponse> result = inventoryService.getItemTransactions(user, 5L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(100L);
        assertThat(result.get(0).getInventoryItemId()).isEqualTo(5L);
        verify(inventoryTransactionRepository).findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(1L, 5L);
    }

    @Test
    void getItemTransactionsFailsWhenItemBelongsToAnotherBrand() {
        User user = storeStaff(10L, 1L, 1001L);
        // 다른 브랜드의 아이템은 findByIdAndBrandId에서 걸러져 조회되지 않는다.
        when(inventoryItemRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.getItemTransactions(user, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVENTORY_NOT_FOUND);

        verify(inventoryTransactionRepository, never())
                .findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(anyLong(), anyLong());
    }

    @Test
    void getItemTransactionsFailsWhenStoreStaffViewsOtherStoreItem() {
        User user = storeStaff(10L, 1L, 1001L);
        // 같은 브랜드지만 다른 매장(2002) 아이템 → 매장 스코프 위반
        InventoryItem item = item(5L, 1L, 2002L);
        when(inventoryItemRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> inventoryService.getItemTransactions(user, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(inventoryTransactionRepository, never())
                .findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(anyLong(), anyLong());
    }

    @Test
    void getItemTransactionsAllowsHqStaffToViewAnyStoreItem() {
        User user = hqStaff(20L, 1L);
        // 본사 직원은 본인 storeId와 무관하게 임의 매장(2002) 아이템 이력을 조회할 수 있다.
        InventoryItem item = item(5L, 1L, 2002L);
        when(inventoryItemRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(1L, 5L))
                .thenReturn(List.of(transaction(100L, 1L, 2002L, 5L)));

        List<InventoryTransactionResponse> result = inventoryService.getItemTransactions(user, 5L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStoreId()).isEqualTo(2002L);
        verify(inventoryTransactionRepository).findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(1L, 5L);
    }

    @Test
    void getTransactionsScopesStoreStaffToOwnStore() {
        User user = storeStaff(10L, 1L, 1001L);
        when(inventoryTransactionRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(1L, 1001L))
                .thenReturn(List.of(transaction(100L, 1L, 1001L, 5L)));

        List<InventoryTransactionResponse> result = inventoryService.getTransactions(user);

        assertThat(result).hasSize(1);
        verify(inventoryTransactionRepository).findByBrandIdAndStoreIdOrderByCreatedAtDesc(1L, 1001L);
        verify(inventoryTransactionRepository, never()).findByBrandIdOrderByCreatedAtDesc(anyLong());
    }

    @Test
    void getTransactionsReturnsAllStoresForHqStaff() {
        User user = hqStaff(20L, 1L);
        when(inventoryTransactionRepository.findByBrandIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(transaction(100L, 1L, 1001L, 5L), transaction(99L, 1L, 2002L, 6L)));

        List<InventoryTransactionResponse> result = inventoryService.getTransactions(user);

        assertThat(result).hasSize(2);
        verify(inventoryTransactionRepository).findByBrandIdOrderByCreatedAtDesc(1L);
        verify(inventoryTransactionRepository, never())
                .findByBrandIdAndStoreIdOrderByCreatedAtDesc(anyLong(), anyLong());
    }

    private InventoryItem item(Long id, Long brandId, Long storeId) {
        return InventoryItem.builder()
                .id(id)
                .brandId(brandId)
                .storeId(storeId)
                .storeCode(String.valueOf(storeId))
                .storeName("매장" + storeId)
                .productCode("J1-0-4-4-01-101")
                .productName("테스트 상품")
                .quantity(10)
                .build();
    }

    private InventoryTransaction transaction(Long id, Long brandId, Long storeId, Long itemId) {
        return InventoryTransaction.builder()
                .id(id)
                .brandId(brandId)
                .storeId(storeId)
                .inventoryItemId(itemId)
                .productCode("J1-0-4-4-01-101")
                .productName("테스트 상품")
                .quantity(2)
                .remainingQuantity(8)
                .usedById(10L)
                .usedByName("테스트 사용자")
                .build();
    }

    private User storeStaff(Long id, Long brandId, Long storeId) {
        return User.builder()
                .id(id)
                .email("staff@flowre.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("매장 직원")
                .role(UserRole.STORE_STAFF)
                .brandId(brandId)
                .storeId(storeId)
                .storeCode(String.valueOf(storeId))
                .storeName("강남점")
                .build();
    }

    private User hqStaff(Long id, Long brandId) {
        return User.builder()
                .id(id)
                .email("hq@flowre.com")
                .employeeCode("9001ABCD!")
                .password("encoded")
                .name("본사 직원")
                .role(UserRole.HQ_STAFF)
                .brandId(brandId)
                .storeId(9001L)
                .storeCode("9001")
                .storeName("본사")
                .build();
    }
}
