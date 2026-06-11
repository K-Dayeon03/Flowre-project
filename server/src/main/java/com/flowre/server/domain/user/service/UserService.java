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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 직원 계정 관리 서비스. 본사(HQ_STAFF/ADMIN)가 직원 아이디와 초기 비밀번호를
 * 직접 발급하면, 해당 직원은 발급받은 점별 코드·직원 아이디·비밀번호로 바로 로그인할 수 있다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    /** 본사 권한자가 같은 브랜드 내 직원 계정 목록을 조회합니다. */
    @Transactional(readOnly = true)
    public List<UserResponse> getEmployees(User requester) {
        assertCanManageEmployees(requester);
        return userRepository.findByBrandIdOrderByEmployeeCodeAsc(requester.getBrandId())
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    /**
     * 본사 권한자가 신규 직원 계정을 발급합니다.
     *
     * 직원 아이디는 점별 코드로 시작해야 하며(로그인 검증과 동일), 대상 매장은
     * 요청자와 같은 브랜드에 활성 상태로 등록되어 있어야 한다. 비밀번호는 BCrypt로 암호화해 저장한다.
     */
    @Transactional
    public UserResponse createEmployee(User requester, EmployeeCreateRequest request) {
        assertCanManageEmployees(requester);

        if (!request.getEmployeeCode().startsWith(request.getStoreCode())) {
            throw new CustomException(ErrorCode.INVALID_EMPLOYEE_CODE);
        }

        Store store = storeRepository
                .findByBrandIdAndStoreCodeAndActiveTrue(requester.getBrandId(), request.getStoreCode())
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));

        if (userRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw new CustomException(ErrorCode.EMPLOYEE_CODE_ALREADY_EXISTS);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User employee = User.builder()
                .email(request.getEmail().trim())
                .employeeCode(request.getEmployeeCode())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName().trim())
                .role(request.getRole())
                .brandId(requester.getBrandId())
                .storeId(store.getId())
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .build();

        User saved = userRepository.save(employee);
        log.info("[User] 직원 계정 발급 — registeredBy={}, employeeCode={}, role={}",
                requester.getEmployeeCode(), saved.getEmployeeCode(), saved.getRole());
        return UserResponse.from(saved);
    }

    private void assertCanManageEmployees(User user) {
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.HQ_STAFF) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
