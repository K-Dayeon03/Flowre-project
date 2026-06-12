package com.flowre.server.domain.user.service;

import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.dto.EmployeeCreateRequest;
import com.flowre.server.domain.user.dto.UserResponse;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.entity.UserStatus;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class UserServiceTest {

    private UserRepository userRepository;
    private StoreRepository storeRepository;
    private PasswordEncoder passwordEncoder;
    private ApprovalNotificationService approvalNotificationService;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        storeRepository = mock(StoreRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        approvalNotificationService = mock(ApprovalNotificationService.class);
        userService = new UserService(userRepository, storeRepository, passwordEncoder, approvalNotificationService);
    }

    @Test
    void createEmployeeSucceedsWhenRequesterIsHq() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001WXYZ!")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@jaju.com")).thenReturn(false);
        when(userRepository.existsByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(true);
        when(passwordEncoder.encode("Password1!")).thenReturn("encoded-pw");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse result = userService.createEmployee(requester, request);

        assertThat(result.getEmployeeCode()).isEqualTo("1001WXYZ!");
        assertThat(result.getStoreId()).isEqualTo(10L);
        assertThat(result.getStoreName()).isEqualTo("강남점");
        assertThat(result.getRole()).isEqualTo("STORE_STAFF");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createEmployeeFailsWhenRequesterIsNotHq() {
        User requester = staffUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);

        assertThatThrownBy(() -> userService.createEmployee(requester, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createEmployeeFailsWhenEmployeeCodeDoesNotStartWithStoreCode() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1002", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);

        assertThatThrownBy(() -> userService.createEmployee(requester, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_EMPLOYEE_CODE);

        verify(storeRepository, never()).findByBrandIdAndStoreCodeAndActiveTrue(any(), anyString());
    }

    @Test
    void createEmployeeFailsWhenStoreNotFound() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.createEmployee(requester, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STORE_NOT_FOUND);
    }

    @Test
    void createEmployeeFailsWhenEmployeeCodeAlreadyExists() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001WXYZ!")).thenReturn(true);

        assertThatThrownBy(() -> userService.createEmployee(requester, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.EMPLOYEE_CODE_ALREADY_EXISTS);
    }

    @Test
    void createStaffFailsWhenStoreHasNoActiveManager() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001WXYZ!")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@jaju.com")).thenReturn(false);
        when(userRepository.existsByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(false);

        assertThatThrownBy(() -> userService.createEmployee(requester, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STORE_MANAGER_REQUIRED);

        verify(userRepository, never()).save(any(User.class));
        verify(approvalNotificationService, never()).notifyManagersOfPendingEmployee(any(), any());
    }

    @Test
    void createFirstManagerIsActiveWhenStoreHasNoActiveManager() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001MGRA!", "manager@jaju.com", UserRole.STORE_MANAGER);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001MGRA!")).thenReturn(false);
        when(userRepository.existsByEmail("manager@jaju.com")).thenReturn(false);
        when(userRepository.existsByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse result = userService.createEmployee(requester, request);

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        verify(approvalNotificationService, never()).notifyManagersOfPendingEmployee(any(), any());
    }

    @Test
    void createSecondManagerIsPendingWhenStoreHasActiveManager() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001MGRB!", "manager2@jaju.com", UserRole.STORE_MANAGER);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001MGRB!")).thenReturn(false);
        when(userRepository.existsByEmail("manager2@jaju.com")).thenReturn(false);
        when(userRepository.existsByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(true);
        when(userRepository.findByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(List.of(managerUser(5L, 10L)));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse result = userService.createEmployee(requester, request);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(approvalNotificationService).notifyManagersOfPendingEmployee(any(), any());
    }

    @Test
    void createEmployeeIsPendingWhenStoreHasActiveManager() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001WXYZ!")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@jaju.com")).thenReturn(false);
        when(userRepository.existsByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(true);
        when(userRepository.findByStoreIdAndRoleAndStatus(10L, UserRole.STORE_MANAGER, UserStatus.ACTIVE))
                .thenReturn(List.of(managerUser(5L, 10L)));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse result = userService.createEmployee(requester, request);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(approvalNotificationService).notifyManagersOfPendingEmployee(any(), any());
    }

    @Test
    void createHqStaffIsActiveEvenWhenStoreHasActiveManager() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newhq@jaju.com", UserRole.HQ_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001WXYZ!")).thenReturn(false);
        when(userRepository.existsByEmail("newhq@jaju.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse result = userService.createEmployee(requester, request);

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        verify(userRepository, never()).existsByStoreIdAndRoleAndStatus(any(), any(), any());
    }

    @Test
    void approveEmployeeSucceedsWhenRequesterIsManagerOfSameStore() {
        User manager = managerUser(5L, 10L);
        User pending = pendingEmployee(100L, 10L);
        when(userRepository.findById(100L)).thenReturn(Optional.of(pending));

        UserResponse result = userService.approveEmployee(manager, 100L);

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(pending.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(pending.getDecidedById()).isEqualTo(5L);
    }

    @Test
    void approveEmployeeFailsWhenManagerOfDifferentStore() {
        User manager = managerUser(5L, 99L);
        User pending = pendingEmployee(100L, 10L);
        when(userRepository.findById(100L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> userService.approveEmployee(manager, 100L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.APPROVAL_NOT_ALLOWED);
    }

    @Test
    void approveEmployeeFailsWhenTargetNotPending() {
        User manager = managerUser(5L, 10L);
        User active = managerUser(100L, 10L); // 이미 ACTIVE 상태
        when(userRepository.findById(100L)).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> userService.approveEmployee(manager, 100L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.EMPLOYEE_NOT_PENDING);
    }

    @Test
    void rejectEmployeeSetsRejectedWithReason() {
        User manager = managerUser(5L, 10L);
        User pending = pendingEmployee(100L, 10L);
        when(userRepository.findById(100L)).thenReturn(Optional.of(pending));

        UserResponse result = userService.rejectEmployee(manager, 100L, "매장 소속 직원이 아닙니다.");

        assertThat(result.getStatus()).isEqualTo("REJECTED");
        assertThat(pending.getStatus()).isEqualTo(UserStatus.REJECTED);
        assertThat(pending.getRejectReason()).isEqualTo("매장 소속 직원이 아닙니다.");
    }

    @Test
    void getPendingEmployeesFailsWhenRequesterIsHqStaff() {
        User requester = hqUser();

        assertThatThrownBy(() -> userService.getPendingEmployees(requester))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.APPROVAL_NOT_ALLOWED);
    }

    private EmployeeCreateRequest request(String storeCode, String employeeCode, String email, UserRole role) {
        EmployeeCreateRequest request = new EmployeeCreateRequest();
        ReflectionTestUtils.setField(request, "name", "새 직원");
        ReflectionTestUtils.setField(request, "email", email);
        ReflectionTestUtils.setField(request, "storeCode", storeCode);
        ReflectionTestUtils.setField(request, "employeeCode", employeeCode);
        ReflectionTestUtils.setField(request, "password", "Password1!");
        ReflectionTestUtils.setField(request, "role", role);
        return request;
    }

    private User hqUser() {
        return User.builder()
                .id(1L)
                .email("hq@jaju.com")
                .employeeCode("0000HQAA!")
                .password("encoded")
                .name("본사")
                .role(UserRole.HQ_STAFF)
                .brandId(1L)
                .storeId(1L)
                .storeCode("0000")
                .storeName("JAJU 본사")
                .build();
    }

    private User staffUser() {
        return User.builder()
                .id(2L)
                .email("staff@jaju.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("직원")
                .role(UserRole.STORE_STAFF)
                .brandId(1L)
                .storeId(10L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }

    private User managerUser(Long id, Long storeId) {
        return User.builder()
                .id(id)
                .email("manager" + id + "@jaju.com")
                .employeeCode("1001MGRA!")
                .password("encoded")
                .name("점장")
                .role(UserRole.STORE_MANAGER)
                .status(UserStatus.ACTIVE)
                .brandId(1L)
                .storeId(storeId)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }

    private User pendingEmployee(Long id, Long storeId) {
        return User.builder()
                .id(id)
                .email("pending" + id + "@jaju.com")
                .employeeCode("1001PEND!")
                .password("encoded")
                .name("대기 직원")
                .role(UserRole.STORE_STAFF)
                .status(UserStatus.PENDING)
                .brandId(1L)
                .storeId(storeId)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }

    private Store store(Long id, String storeCode) {
        return Store.builder()
                .id(id)
                .brandId(1L)
                .storeCode(storeCode)
                .storeName("강남점")
                .active(true)
                .build();
    }
}
