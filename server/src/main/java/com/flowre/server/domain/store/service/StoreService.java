package com.flowre.server.domain.store.service;

import com.flowre.server.domain.store.dto.StoreAddressUpdateRequest;
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
                .postalCode(request.getPostalCode())
                .roadAddress(request.getRoadAddress().trim())
                .jibunAddress(trimToNull(request.getJibunAddress()))
                .detailAddress(trimToNull(request.getDetailAddress()))
                .active(true)
                .build();
        return StoreResponse.from(storeRepository.save(store));
    }

    /** 기존 매장의 주소 정보를 수정합니다. */
    @Transactional
    public StoreResponse updateStoreAddress(User user, Long storeId, StoreAddressUpdateRequest request) {
        assertCanManageStores(user);
        Store store = storeRepository.findById(storeId)
                .filter(s -> s.getBrandId().equals(user.getBrandId()))
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        store.updateAddress(
                request.getPostalCode(),
                request.getRoadAddress().trim(),
                trimToNull(request.getJibunAddress()),
                trimToNull(request.getDetailAddress())
        );
        return StoreResponse.from(store);
    }

    /** 공백을 제거하고, 빈 문자열이면 null을 반환합니다. */
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void assertCanManageStores(User user) {
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.HQ_STAFF) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
