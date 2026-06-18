package com.flowre.server.domain.schedule.service;

import com.flowre.server.domain.schedule.entity.Schedule;
import com.flowre.server.domain.schedule.entity.ScheduleType;
import com.flowre.server.domain.schedule.repository.ScheduleRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class ScheduleServiceTest {

    private ScheduleRepository scheduleRepository;
    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        scheduleRepository = mock(ScheduleRepository.class);
        scheduleService = new ScheduleService(scheduleRepository);
    }

    @Test
    void getListScopesStoreStaffToOwnStore() {
        User user = storeStaff(1L, 1001L);
        when(scheduleRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(1L, 1001L))
                .thenReturn(List.of());

        scheduleService.getList(user, null);

        verify(scheduleRepository).findByBrandIdAndStoreIdOrderByCreatedAtDesc(1L, 1001L);
        verify(scheduleRepository, never()).findByBrandIdOrderByCreatedAtDesc(anyLong());
    }

    @Test
    void getListReturnsAllStoresForHqStaff() {
        User user = hqStaff(1L);
        when(scheduleRepository.findByBrandIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        scheduleService.getList(user, null);

        verify(scheduleRepository).findByBrandIdOrderByCreatedAtDesc(1L);
        verify(scheduleRepository, never())
                .findByBrandIdAndStoreIdOrderByCreatedAtDesc(anyLong(), anyLong());
    }

    @Test
    void getByIdFailsWhenStoreStaffAccessesOtherStoreSchedule() {
        User user = storeStaff(1L, 1001L);
        // 같은 브랜드지만 다른 매장(2002) 스케줄 → 매장 격리 위반
        Schedule schedule = schedule(5L, 1L, 2002L);
        when(scheduleRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(schedule));

        assertThatThrownBy(() -> scheduleService.getById(user, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void deleteFailsWhenStoreStaffDeletesOtherStoreSchedule() {
        User user = storeStaff(1L, 1001L);
        Schedule schedule = schedule(5L, 1L, 2002L);
        when(scheduleRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(schedule));

        assertThatThrownBy(() -> scheduleService.delete(user, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(scheduleRepository, never()).delete(any(Schedule.class));
    }

    @Test
    void getByIdAllowsHqStaffToAccessAnyStoreSchedule() {
        User user = hqStaff(1L);
        Schedule schedule = schedule(5L, 1L, 2002L);
        when(scheduleRepository.findByIdAndBrandId(5L, 1L)).thenReturn(Optional.of(schedule));

        // 예외 없이 통과해야 한다.
        scheduleService.getById(user, 5L);

        verify(scheduleRepository).findByIdAndBrandId(5L, 1L);
    }

    private Schedule schedule(Long id, Long brandId, Long storeId) {
        return Schedule.builder()
                .id(id)
                .title("마네킹 교체")
                .type(ScheduleType.MANNEQUIN)
                .dueDate(LocalDateTime.of(2026, 6, 30, 18, 0))
                .storeId(storeId)
                .brandId(brandId)
                .createdBy("작성자")
                .build();
    }

    private User storeStaff(Long brandId, Long storeId) {
        return User.builder()
                .id(10L)
                .email("staff@jaju.com")
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

    private User hqStaff(Long brandId) {
        return User.builder()
                .id(20L)
                .email("hq@jaju.com")
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
