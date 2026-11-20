package com.flowre.server.domain.sales.service;

import com.flowre.server.domain.sales.entity.PaymentMethod;
import com.flowre.server.domain.sales.entity.SalesSource;
import com.flowre.server.domain.sales.entity.SalesTransaction;
import com.flowre.server.domain.sales.repository.SalesTransactionRepository;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SalesServiceTest {

    private SalesTransactionRepository salesRepository;
    private StoreRepository storeRepository;
    private SalesService salesService;

    @BeforeEach
    void setUp() {
        salesRepository = mock(SalesTransactionRepository.class);
        storeRepository = mock(StoreRepository.class);
        salesService = new SalesService(salesRepository, storeRepository);
    }

    @Test
    void summaryCalculatesTodayRevenueAndCompareRate() {
        User user = user(UserRole.STORE_MANAGER, 1001L);
        when(salesRepository.findByBrandIdAndStoreIdAndTransactionDateTimeBetween(
                eq(1L), eq(1001L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(tx(1001L, 10000, 1), tx(1001L, 20000, 2)))
                .thenReturn(List.of(tx(1001L, 15000, 1)))
                .thenReturn(List.of())
                .thenReturn(List.of())
                .thenReturn(List.of())
                .thenReturn(List.of());

        var summary = salesService.getSummary(user, null);

        assertThat(summary.getToday().getTotalRevenue()).isEqualTo(30000);
        assertThat(summary.getToday().getTotalOrders()).isEqualTo(3);
        assertThat(summary.getToday().getAverageOrderValue()).isEqualTo(10000);
        assertThat(summary.getToday().getComparedToPrevious()).isEqualTo(100.0);
    }

    @Test
    void storeComparisonFailsForStoreStaff() {
        User user = user(UserRole.STORE_STAFF, 1001L);

        assertThatThrownBy(() -> salesService.getStoreComparison(user, LocalDate.now()))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    private SalesTransaction tx(Long storeId, int amount, int orderCount) {
        return SalesTransaction.builder()
                .brandId(1L)
                .storeId(storeId)
                .storeName("강남점")
                .transactionDateTime(LocalDateTime.now())
                .amount(amount)
                .orderCount(orderCount)
                .paymentMethod(PaymentMethod.CARD)
                .source(SalesSource.MANUAL)
                .build();
    }

    private User user(UserRole role, Long storeId) {
        return User.builder()
                .id(10L)
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

