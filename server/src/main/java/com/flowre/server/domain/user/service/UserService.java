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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 직원 계정 관리 서비스.
 *
 * 본사(HQ_STAFF/ADMIN)가 직원 아이디와 초기 비밀번호를 발급한다. 단, 매장 직원
 * (STORE_STAFF/STORE_MANAGER)을 등록할 때 해당 매장에 이미 활성 점장이 있다면,
 * 계정은 승인 대기(PENDING) 상태로 생성되어 점장이 "실제 매장 소속 직원"임을 확인·승인하기
 * 전까지 로그인할 수 없다. 점장이 없는 매장(예: 첫 점장 등록)이나 본사 직원(HQ_STAFF)은
 * 승인 대상이 없으므로 곧바로 활성(ACTIVE) 상태로 생성된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApprovalNotificationService approvalNotificationService;

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
     * 매장 직원 등록 시 해당 매장에 활성 점장이 있으면 PENDING 상태로 생성하고 점장에게 승인 요청 알림을 보낸다.
     */
    @Transactional
    public UserResponse createEmployee(User requester, EmployeeCreateRequest request) {
        assertCanManageEmployees(requester);
        assertCanAssignRole(requester, request.getRole());

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

        UserStatus status = resolveInitialStatus(request.getRole(), store.getId());
        boolean requiresApproval = status == UserStatus.PENDING;

        User employee = User.builder()
                .email(request.getEmail().trim())
                .employeeCode(request.getEmployeeCode())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName().trim())
                .role(request.getRole())
                .status(status)
                .registeredById(requester.getId())
                .brandId(requester.getBrandId())
                .storeId(store.getId())
                .storeCode(store.getStoreCode())
                .storeName(store.getStoreName())
                .build();

        User saved = userRepository.save(employee);
        log.info("[User] 직원 계정 발급 — registeredBy={}, employeeCode={}, role={}, status={}",
                requester.getEmployeeCode(), saved.getEmployeeCode(), saved.getRole(), saved.getStatus());

        if (requiresApproval) {
            List<User> managers = userRepository.findByStoreIdAndRoleAndStatus(
                    store.getId(), UserRole.STORE_MANAGER, UserStatus.ACTIVE);
            approvalNotificationService.notifyManagersOfPendingEmployee(managers, saved);
        }

        return UserResponse.from(saved);
    }

    /**
     * 점장(또는 관리자)이 자신의 매장(관리자는 브랜드 전체)에서 승인 대기 중인 직원 목록을 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> getPendingEmployees(User requester) {
        List<User> pending;
        if (requester.getRole() == UserRole.ADMIN) {
            pending = userRepository.findByBrandIdAndStatusOrderByCreatedAtAsc(
                    requester.getBrandId(), UserStatus.PENDING);
        } else if (requester.getRole() == UserRole.STORE_MANAGER) {
            pending = userRepository.findByStoreIdAndStatusOrderByCreatedAtAsc(
                    requester.getStoreId(), UserStatus.PENDING);
        } else {
            throw new CustomException(ErrorCode.APPROVAL_NOT_ALLOWED);
        }
        return pending.stream().map(UserResponse::from).toList();
    }

    /** 점장(또는 관리자)이 승인 대기 직원 계정을 승인해 로그인 가능 상태로 전환합니다. */
    @Transactional
    public UserResponse approveEmployee(User requester, Long employeeId) {
        User employee = findPendingTarget(requester, employeeId);
        employee.approve(requester.getId(), LocalDateTime.now());
        log.info("[User] 직원 계정 승인 — approvedBy={}, employeeCode={}",
                requester.getEmployeeCode(), employee.getEmployeeCode());
        return UserResponse.from(employee);
    }

    /** 점장(또는 관리자)이 승인 대기 직원 계정을 거절합니다. */
    @Transactional
    public UserResponse rejectEmployee(User requester, Long employeeId, String reason) {
        User employee = findPendingTarget(requester, employeeId);
        employee.reject(requester.getId(), reason.trim(), LocalDateTime.now());
        log.info("[User] 직원 계정 거절 — rejectedBy={}, employeeCode={}, reason={}",
                requester.getEmployeeCode(), employee.getEmployeeCode(), reason.trim());
        return UserResponse.from(employee);
    }

    /**
     * 승인/거절 대상 직원을 조회하고, 요청자가 승인 권한을 가지며 대상이 PENDING 상태인지 검증합니다.
     */
    private User findPendingTarget(User requester, Long employeeId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        assertCanApprove(requester, employee);
        if (!employee.isPending()) {
            throw new CustomException(ErrorCode.EMPLOYEE_NOT_PENDING);
        }
        return employee;
    }

    /**
     * 신규 직원 계정의 초기 상태를 결정한다.
     *
     * <ul>
     *   <li>STORE_STAFF(일반 직원): 해당 매장에 활성 점장이 <b>반드시</b> 먼저 등록되어 있어야 하며,
     *       없으면 등록을 거부한다(점장이 승인·알림 수신 주체이기 때문). 점장이 있으면 PENDING으로 생성한다.</li>
     *   <li>STORE_MANAGER(점장): 매장의 첫 점장(활성 점장 부재)은 부트스트랩으로 즉시 ACTIVE,
     *       이미 활성 점장이 있으면 기존 점장 승인을 위해 PENDING으로 생성한다.</li>
     *   <li>HQ_STAFF/ADMIN(본사): 승인 주체가 없으므로 즉시 ACTIVE.</li>
     * </ul>
     */
    private UserStatus resolveInitialStatus(UserRole role, Long storeId) {
        if (role == UserRole.STORE_STAFF) {
            if (!hasActiveManager(storeId)) {
                throw new CustomException(ErrorCode.STORE_MANAGER_REQUIRED);
            }
            return UserStatus.PENDING;
        }
        if (role == UserRole.STORE_MANAGER) {
            return hasActiveManager(storeId) ? UserStatus.PENDING : UserStatus.ACTIVE;
        }
        return UserStatus.ACTIVE;
    }

    /** 매장에 활성(ACTIVE) 점장이 존재하는지 확인합니다. */
    private boolean hasActiveManager(Long storeId) {
        return userRepository.existsByStoreIdAndRoleAndStatus(storeId, UserRole.STORE_MANAGER, UserStatus.ACTIVE);
    }

    private void assertCanManageEmployees(User user) {
        if (!user.getRole().canManage()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    /**
     * 요청자가 부여하려는 권한을 발급할 수 있는지 검증합니다.
     * ADMIN 계정은 오직 ADMIN만 생성할 수 있어, HQ_STAFF가 ADMIN을 만들어 권한을 상승시키는 것을 막는다.
     */
    private void assertCanAssignRole(User requester, UserRole targetRole) {
        if (targetRole == UserRole.ADMIN && requester.getRole() != UserRole.ADMIN) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    /**
     * 요청자가 대상 직원을 승인/거절할 권한이 있는지 검증합니다.
     * 관리자(ADMIN)는 같은 브랜드 전체, 점장(STORE_MANAGER)은 자신의 매장 직원만 승인할 수 있다.
     */
    private void assertCanApprove(User requester, User target) {
        if (requester.getRole() == UserRole.ADMIN) {
            if (!requester.getBrandId().equals(target.getBrandId())) {
                throw new CustomException(ErrorCode.APPROVAL_NOT_ALLOWED);
            }
            return;
        }
        if (requester.getRole() == UserRole.STORE_MANAGER) {
            if (!requester.getStoreId().equals(target.getStoreId())) {
                throw new CustomException(ErrorCode.APPROVAL_NOT_ALLOWED);
            }
            return;
        }
        throw new CustomException(ErrorCode.APPROVAL_NOT_ALLOWED);
    }
}
