package com.flowre.server.domain.store.service;

import com.flowre.server.domain.store.dto.StoreAddressUpdateRequest;
import com.flowre.server.domain.store.dto.StoreCreateRequest;
import com.flowre.server.domain.store.dto.NearbyStoreResponse;
import com.flowre.server.domain.store.dto.StoreResponse;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.chat.repository.ChatRoomRepository;
import com.flowre.server.domain.chat.repository.MessageRepository;
import com.flowre.server.domain.schedule.repository.ScheduleRepository;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class StoreServiceTest {

    private StoreRepository storeRepository;
    private ScheduleRepository scheduleRepository;
    private ChatRoomRepository chatRoomRepository;
    private MessageRepository messageRepository;
    private UserRepository userRepository;
    private StoreService storeService;

    @BeforeEach
    void setUp() {
        storeRepository = mock(StoreRepository.class);
        scheduleRepository = mock(ScheduleRepository.class);
        chatRoomRepository = mock(ChatRoomRepository.class);
        messageRepository = mock(MessageRepository.class);
        userRepository = mock(UserRepository.class);
        storeService = new StoreService(storeRepository, scheduleRepository, chatRoomRepository, messageRepository, userRepository);
    }

    @Test
    void adminCanCreateStore() {
        User admin = user(UserRole.ADMIN);
        StoreCreateRequest request = createRequest("강남점");
        when(storeRepository.existsByBrandIdAndStoreCode(eq(1L), anyString())).thenReturn(false);
        when(storeRepository.saveAndFlush(any(Store.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StoreResponse response = storeService.createStore(admin, request);

        assertThat(response.getStoreCode()).matches("^\\d{4}$");
        assertThat(response.getStoreCode()).isNotEqualTo("0000");
        assertThat(response.getStoreName()).isEqualTo("강남점");
        assertThat(response.getPostalCode()).isEqualTo("06035");
        assertThat(response.getRoadAddress()).isEqualTo("서울 강남구 가로수길 5");
        assertThat(response.getLatitude()).isEqualTo(37.5219);
        assertThat(response.getLongitude()).isEqualTo(127.0227);
    }

    @Test
    void updateStoreAddressReplacesAddressFields() {
        User hq = user(UserRole.HQ_STAFF);
        Store existing = store(7L, "1001", "강남점");
        when(storeRepository.findById(7L)).thenReturn(java.util.Optional.of(existing));

        StoreAddressUpdateRequest request = new StoreAddressUpdateRequest();
        ReflectionTestUtils.setField(request, "postalCode", "06035");
        ReflectionTestUtils.setField(request, "roadAddress", "서울 강남구 가로수길 5");
        ReflectionTestUtils.setField(request, "detailAddress", "2층");

        StoreResponse response = storeService.updateStoreAddress(hq, 7L, request);

        assertThat(response.getPostalCode()).isEqualTo("06035");
        assertThat(response.getRoadAddress()).isEqualTo("서울 강남구 가로수길 5");
        assertThat(response.getDetailAddress()).isEqualTo("2층");
    }

    @Test
    void updateStoreAddressFailsForOtherBrandStore() {
        User hq = user(UserRole.HQ_STAFF);
        Store otherBrand = Store.builder().id(8L).brandId(2L).storeCode("2001").storeName("부산점").active(true).build();
        when(storeRepository.findById(8L)).thenReturn(java.util.Optional.of(otherBrand));

        StoreAddressUpdateRequest request = new StoreAddressUpdateRequest();
        ReflectionTestUtils.setField(request, "postalCode", "06035");
        ReflectionTestUtils.setField(request, "roadAddress", "서울 강남구 가로수길 5");

        assertThatThrownBy(() -> storeService.updateStoreAddress(hq, 8L, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STORE_NOT_FOUND);
    }

    @Test
    void createStoreFailsWhenStoreCodePoolIsExhausted() {
        when(storeRepository.existsByBrandIdAndStoreCode(eq(1L), anyString())).thenReturn(true);

        assertThatThrownBy(() -> storeService.createStore(user(UserRole.HQ_STAFF), createRequest("강남점")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STORE_CODE_EXHAUSTED);
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

    @Test
    void nearbyStoresSortsByHaversineDistanceAndLimitsResult() {
        Store gangnam = storeWithCoordinates(1L, "1001", "강남점", 37.4979, 127.0276);
        Store busan = storeWithCoordinates(2L, "2001", "부산점", 35.1150, 129.0415);
        when(storeRepository.findByActiveTrueAndLatitudeIsNotNullAndLongitudeIsNotNull())
                .thenReturn(List.of(busan, gangnam));

        List<NearbyStoreResponse> responses = storeService.getNearbyStores(37.4980, 127.0275, 1);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getStoreCode()).isEqualTo("1001");
        assertThat(responses.get(0).getDistanceMeters()).isLessThan(100);
    }

    @Test
    void hqCanAccessOnlySameBrandStore() {
        User hq = user(UserRole.HQ_STAFF);
        when(storeRepository.findById(7L)).thenReturn(Optional.of(store(7L, "1001", "강남점")));

        storeService.assertCanAccessStore(hq, 7L);

        verify(storeRepository).findById(7L);
    }

    @Test
    void hqCannotAccessOtherBrandStore() {
        User hq = user(UserRole.HQ_STAFF);
        Store otherBrand = Store.builder().id(8L).brandId(2L).storeCode("2001").storeName("부산점").active(true).build();
        when(storeRepository.findById(8L)).thenReturn(Optional.of(otherBrand));

        assertThatThrownBy(() -> storeService.assertCanAccessStore(hq, 8L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void storeStaffCanAccessOnlyOwnStore() {
        User staff = user(UserRole.STORE_STAFF);

        storeService.assertCanAccessStore(staff, 1001L);

        assertThatThrownBy(() -> storeService.assertCanAccessStore(staff, 2001L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    private StoreCreateRequest createRequest(String storeName) {
        StoreCreateRequest request = new StoreCreateRequest();
        ReflectionTestUtils.setField(request, "storeName", storeName);
        ReflectionTestUtils.setField(request, "postalCode", "06035");
        ReflectionTestUtils.setField(request, "roadAddress", "서울 강남구 가로수길 5");
        ReflectionTestUtils.setField(request, "jibunAddress", "서울 강남구 신사동 533");
        ReflectionTestUtils.setField(request, "detailAddress", "1층");
        ReflectionTestUtils.setField(request, "latitude", 37.5219);
        ReflectionTestUtils.setField(request, "longitude", 127.0227);
        return request;
    }

    private User user(UserRole role) {
        return User.builder()
                .id(1L)
                .email("user@flowre.com")
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

    private Store storeWithCoordinates(Long id, String storeCode, String storeName, Double latitude, Double longitude) {
        return Store.builder()
                .id(id)
                .brandId(1L)
                .storeCode(storeCode)
                .storeName(storeName)
                .latitude(latitude)
                .longitude(longitude)
                .active(true)
                .build();
    }
}
