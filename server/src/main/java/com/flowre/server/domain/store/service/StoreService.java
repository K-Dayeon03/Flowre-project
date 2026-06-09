package com.flowre.server.domain.store.service;

import com.flowre.server.domain.store.dto.StoreCreateRequest;
import com.flowre.server.domain.store.dto.StoreResponse;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreRepository storeRepository;

    /** 브랜드 내 점별 매장 목록을 조회합니다. */
    @Transactional(readOnly = true)
    public List<StoreResponse> getStores(User user) {
        assertCanManageStores(user);
        return storeRepository.findByBrandIdOrderByStoreCodeAsc(user.getBrandId())
                .stream()
                .map(StoreResponse::from)
                .toList();
    }

    /** 브랜드 내 점별 매장을 신규 등록합니다. */
    @Transactional
    public StoreResponse createStore(User user, StoreCreateRequest request) {
        assertCanManageStores(user);
        if (storeRepository.existsByBrandIdAndStoreCode(user.getBrandId(), request.getStoreCode())) {
            throw new CustomException(ErrorCode.STORE_ALREADY_EXISTS);
        }

        Store store = Store.builder()
                .brandId(user.getBrandId())
                .storeCode(request.getStoreCode())
                .storeName(request.getStoreName().trim())
                .active(true)
                .build();
        return StoreResponse.from(storeRepository.save(store));
    }

    private void assertCanManageStores(User user) {
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.HQ_STAFF) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
