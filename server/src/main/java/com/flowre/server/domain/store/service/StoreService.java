package com.flowre.server.domain.store.service;

import com.flowre.server.domain.chat.entity.ChatRoom;
import com.flowre.server.domain.chat.entity.RoomType;
import com.flowre.server.domain.chat.repository.ChatRoomRepository;
import com.flowre.server.domain.chat.repository.MessageRepository;
import com.flowre.server.domain.schedule.entity.ScheduleStatus;
import com.flowre.server.domain.schedule.repository.ScheduleRepository;
import com.flowre.server.domain.store.dto.StoreActivityResponse;
import com.flowre.server.domain.store.dto.StoreAddressUpdateRequest;
import com.flowre.server.domain.store.dto.StoreCreateRequest;
import com.flowre.server.domain.store.dto.NearbyStoreResponse;
import com.flowre.server.domain.store.dto.StoreResponse;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.entity.StoreOperationStatus;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.entity.UserStatus;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreRepository storeRepository;
    private final ScheduleRepository scheduleRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private static final SecureRandom STORE_CODE_RANDOM = new SecureRandom();
    private static final int MIN_STORE_CODE = 1;
    private static final int MAX_STORE_CODE = 9999;
    private static final int MAX_STORE_CODE_GENERATION_ATTEMPTS = 100;
    private static final int DEFAULT_NEARBY_LIMIT = 5;
    private static final int MAX_NEARBY_LIMIT = 20;
    private static final double EARTH_RADIUS_METERS = 6_371_000;

    /**
     * 매장 Activity 현황 조회.
     * - HQ/ADMIN: 브랜드 전 매장
     * - STORE_MANAGER: 본인 매장 1개
     */
    @Transactional(readOnly = true)
    public List<StoreActivityResponse> getStoreActivity(User user) {
        boolean isManager = user.getRole() == UserRole.STORE_MANAGER;
        if (!user.getRole().isHeadquarters() && !isManager) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

        List<Store> stores = user.getRole().isHeadquarters()
                ? storeRepository.findByBrandIdOrderByStoreCodeAsc(user.getBrandId())
                : storeRepository.findById(user.getStoreId()).map(java.util.List::of).orElse(java.util.List.of());

        return stores.stream()
                .map(store -> {
                    LocalDateTime lastActivity = chatRoomRepository
                            .findByStoreIdAndType(store.getId(), RoomType.GROUP)
                            .flatMap(room -> messageRepository.findTopByRoomIdOrderBySentAtDesc(room.getId()))
                            .map(msg -> msg.getSentAt())
                            .orElse(null);

                    int total = (int) scheduleRepository.countByStoreIdAndDueDateBetween(
                            store.getId(), todayStart, todayEnd);
                    int done = (int) scheduleRepository.countByStoreIdAndStatusAndDueDateBetween(
                            store.getId(), ScheduleStatus.DONE, todayStart, todayEnd);
                    long activeStaff = userRepository.countByStoreIdAndStatus(
                            store.getId(), UserStatus.ACTIVE);

                    return StoreActivityResponse.of(store, lastActivity, total, done, activeStaff);
                })
                .toList();
    }

    /**
     * 매장 운영 상태를 변경합니다.
     * 점장은 본인 매장만, HQ/ADMIN은 브랜드 내 모든 매장 변경 가능.
     */
    @Transactional
    public StoreActivityResponse updateOperationStatus(User user, Long storeId, StoreOperationStatus status) {
        Store store = storeRepository.findById(storeId)
                .filter(s -> s.getBrandId().equals(user.getBrandId()))
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        boolean canUpdate = user.getRole().isHeadquarters()
                || (user.getRole() == UserRole.STORE_MANAGER && store.getId().equals(user.getStoreId()));
        if (!canUpdate) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        store.updateOperationStatus(status);
        storeRepository.saveAndFlush(store);
        return StoreActivityResponse.of(store, null, 0, 0, 0);
    }

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
        String storeCode = generateUniqueStoreCode(user.getBrandId());

        Store store = Store.builder()
                .brandId(user.getBrandId())
                .storeCode(storeCode)
                .storeName(request.getStoreName().trim())
                .postalCode(request.getPostalCode())
                .roadAddress(request.getRoadAddress().trim())
                .jibunAddress(trimToNull(request.getJibunAddress()))
                .detailAddress(trimToNull(request.getDetailAddress()))
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .active(true)
                .build();
        return StoreResponse.from(storeRepository.saveAndFlush(store));
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

    /** 좌표가 등록된 활성 매장 중 현재 위치와 가까운 매장을 조회합니다. */
    @Transactional(readOnly = true)
    public List<NearbyStoreResponse> getNearbyStores(Double latitude, Double longitude, Integer limit) {
        int size = normalizeLimit(limit);
        return storeRepository.findByActiveTrueAndLatitudeIsNotNullAndLongitudeIsNotNull()
                .stream()
                .map(store -> NearbyCandidate.from(store, distanceMeters(
                        latitude,
                        longitude,
                        store.getLatitude(),
                        store.getLongitude()
                )))
                .sorted()
                .limit(size)
                .map(candidate -> NearbyStoreResponse.from(candidate.store(), Math.round(candidate.distanceMeters())))
                .toList();
    }

    /**
     * 사용자 역할에 따라 특정 매장 컨텍스트 접근 가능 여부를 검증합니다.
     *
     * ADMIN/HQ_STAFF는 같은 브랜드 매장만, STORE_MANAGER/STORE_STAFF는 본인 매장만 허용합니다.
     */
    @Transactional(readOnly = true)
    public void assertCanAccessStore(User user, Long storeId) {
        if (user.getRole().canViewAllStores()) {
            boolean sameBrandStore = storeRepository.findById(storeId)
                    .map(store -> store.getBrandId().equals(user.getBrandId()))
                    .orElse(false);
            if (sameBrandStore) {
                return;
            }
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        if (user.getStoreId().equals(storeId)) {
            return;
        }
        throw new CustomException(ErrorCode.FORBIDDEN);
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
        if (!user.getRole().canManage()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private String generateUniqueStoreCode(Long brandId) {
        for (int attempt = 0; attempt < MAX_STORE_CODE_GENERATION_ATTEMPTS; attempt++) {
            String candidate = randomStoreCode();
            if (!storeRepository.existsByBrandIdAndStoreCode(brandId, candidate)) {
                return candidate;
            }
        }
        throw new CustomException(ErrorCode.STORE_CODE_EXHAUSTED);
    }

    private String randomStoreCode() {
        int code = STORE_CODE_RANDOM.nextInt(MAX_STORE_CODE - MIN_STORE_CODE + 1) + MIN_STORE_CODE;
        return "%04d".formatted(code);
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_NEARBY_LIMIT;
        }
        if (limit < 1) {
            return DEFAULT_NEARBY_LIMIT;
        }
        return Math.min(limit, MAX_NEARBY_LIMIT);
    }

    private double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    private record NearbyCandidate(Store store, double distanceMeters) implements Comparable<NearbyCandidate> {

        private static NearbyCandidate from(Store store, double distanceMeters) {
            return new NearbyCandidate(store, distanceMeters);
        }

        @Override
        public int compareTo(NearbyCandidate other) {
            return Double.compare(this.distanceMeters, other.distanceMeters);
        }
    }
}
