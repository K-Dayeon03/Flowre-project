package com.flowre.server.domain.store.service;

import com.flowre.server.domain.store.dto.StoreCreateRequest;
import com.flowre.server.domain.store.dto.StoreResponse;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class StoreServiceTest {

    private StoreRepository storeRepository;
    private StoreService storeService;

    @BeforeEach
    void setUp() {
        storeRepository = mock(StoreRepository.class);
        storeService = new StoreService(storeRepository);
    }

    @Test
    void adminCanCreateStore() {
        User admin = user(UserRole.ADMIN);
        StoreCreateRequest request = createRequest("1001", "강남점");
        Store saved = store(1L, "1001", "강남점");
        when(storeRepository.existsByBrandIdAndStoreCode(1L, "1001")).thenReturn(false);
        when(storeRepository.save(any(Store.class))).thenReturn(saved);

        StoreResponse response = storeService.createStore(admin, request);

        assertThat(response.getStoreCode()).isEqualTo("1001");
        assertThat(response.getStoreName()).isEqualTo("강남점");
    }

    @Test
    void duplicateStoreCodeFails() {
        when(storeRepository.existsByBrandIdAndStoreCode(1L, "1001")).thenReturn(true);

        assertThatThrownBy(() -> storeService.createStore(user(UserRole.HQ_STAFF), createRequest("1001", "강남점")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STORE_ALREADY_EXISTS);
    }

    @Test
    void storeStaffCannotManageStores() {
        assertThatThrownBy(() -> storeService.getStores(user(UserRole.STORE_STAFF)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void hqCanListStoresByBrand() {
        when(storeRepository.findByBrandIdOrderByStoreCodeAsc(1L))
                .thenReturn(List.of(store(1L, "1001", "강남점")));

        List<StoreResponse> stores = storeService.getStores(user(UserRole.HQ_STAFF));

        assertThat(stores).hasSize(1);
        assertThat(stores.get(0).getStoreCode()).isEqualTo("1001");
    }

    private StoreCreateRequest createRequest(String storeCode, String storeName) {
        StoreCreateRequest request = new StoreCreateRequest();
        ReflectionTestUtils.setField(request, "storeCode", storeCode);
        ReflectionTestUtils.setField(request, "storeName", storeName);
        return request;
    }

    private User user(UserRole role) {
        return User.builder()
                .id(1L)
                .email("user@jaju.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("테스트")
                .role(role)
                .brandId(1L)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }

    private Store store(Long id, String storeCode, String storeName) {
        return Store.builder()
                .id(id)
                .brandId(1L)
                .storeCode(storeCode)
                .storeName(storeName)
                .active(true)
                .build();
    }
}
