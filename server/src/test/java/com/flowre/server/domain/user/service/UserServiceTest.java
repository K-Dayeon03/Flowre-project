package com.flowre.server.domain.user.service;

import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.dto.EmployeeCreateRequest;
import com.flowre.server.domain.user.dto.UserResponse;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

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
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        storeRepository = mock(StoreRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        userService = new UserService(userRepository, storeRepository, passwordEncoder);
    }

    @Test
    void createEmployeeSucceedsWhenRequesterIsHq() {
        User requester = hqUser();
        EmployeeCreateRequest request = request("1001", "1001WXYZ!", "newuser@jaju.com", UserRole.STORE_STAFF);
        when(storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, "1001"))
                .thenReturn(Optional.of(store(10L, "1001")));
        when(userRepository.existsByEmployeeCode("1001WXYZ!")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@jaju.com")).thenReturn(false);
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
