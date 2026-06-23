package com.flowre.server.domain.user.service;

import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.service.AuditLogService;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.dto.*;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.entity.UserStatus;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 직원 계정 관리 서비스.
 *
 * CRUD, 비밀번호 초기화, 코드 로테이션을 담당한다.
 * 본사(HQ_STAFF/ADMIN)가 직원 아이디와 초기 비밀번호를 발급하며, 매장 직원(STORE_STAFF)
 * 등록 시 해당 매장에 활성 점장이 있으면 PENDING으로 생성해 점장 승인을 요구한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private static final String SUFFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
    private static final String SPECIAL_CHARS = "!@#$%^&*?";
    private static final int MAX_CODE_RETRY = 100;

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApprovalNotificationService approvalNotificationService;
    private final AuditLogService auditLogService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${flowre.employee.code-rotation-days:90}")
    private int codeRotationDays;

    // ── 조회 ────────────────────────────────────────────────────────

    /** 본사 권한자가 같은 브랜드 내 직원 계정 목록을 조회합니다. */
    @Transactional(readOnly = true)
    public List<UserResponse> getEmployees(User requester) {
        assertCanManageEmployees(requester);
        return userRepository.findByBrandIdOrderByEmployeeCodeAsc(requester.getBrandId())
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    /** 같은 매장의 활성 직원 목록을 조회합니다 — 채팅 대상 선택용, 본인 제외. */
    @Transactional(readOnly = true)
    public List<UserResponse> getStoreMembers(User requester) {
        return userRepository.findByStoreIdAndStatusOrderByCreatedAtAsc(requester.getStoreId(), UserStatus.ACTIVE)
                .stream()
                .filter(u -> !u.getId().equals(requester.getId()))
                .map(UserResponse::from)
                .toList();
    }

    // ── Create ──────────────────────────────────────────────────────

    /**
     * 본사 권한자가 신규 직원 계정을 발급합니다.
     *
     * 직원 아이디는 점별 코드로 시작해야 하며, 대상 매장은 같은 브랜드에 활성 상태로 등록되어야 한다.
     * 매장 직원 등록 시 해당 매장에 활성 점장이 있으면 PENDING으로 생성하고 점장에게 알림을 보낸다.
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

    // ── Update ──────────────────────────────────────────────────────

    /**
     * 직원 계정 이름·이메일·역할을 수정합니다.
     * ADMIN 계정은 수정 불가이며, 본사(HQ/ADMIN)만 호출할 수 있습니다.
     */
    @Transactional
    public UserResponse updateEmployee(User requester, Long id, EmployeeUpdateRequest request) {
        assertCanManageEmployees(requester);
        User target = findInBrand(requester, id);
        assertNotAdmin(target);
        assertCanAssignRole(requester, request.getRole());

        String newEmail = request.getEmail().trim();
        if (!newEmail.equals(target.getEmail()) && userRepository.existsByEmail(newEmail)) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        target.updateInfo(request.getName().trim(), newEmail);
        auditLogService.record(requester, AuditAction.EMPLOYEE_UPDATED, "EMPLOYEE", target.getId(),
                "직원 정보 수정: " + target.getEmployeeCode());
        log.info("[User] 직원 정보 수정 — by={}, target={}", requester.getEmployeeCode(), target.getEmployeeCode());
        return UserResponse.from(target);
    }

    // ── Delete ──────────────────────────────────────────────────────

    /**
     * 직원 계정을 비활성화(소프트 삭제)합니다.
     * ADMIN 계정과 자기 자신은 삭제 불가입니다.
     */
    @Transactional
    public void deleteEmployee(User requester, Long id) {
        assertCanManageEmployees(requester);
        if (requester.getId().equals(id)) {
            throw new CustomException(ErrorCode.CANNOT_SELF_DELETE);
        }
        User target = findInBrand(requester, id);
        assertNotAdmin(target);

        target.deactivate();
        auditLogService.record(requester, AuditAction.EMPLOYEE_DELETED, "EMPLOYEE", target.getId(),
                "직원 계정 비활성화: " + target.getEmployeeCode());
        log.info("[User] 직원 계정 비활성화 — by={}, target={}", requester.getEmployeeCode(), target.getEmployeeCode());
    }

    // ── Password Reset ──────────────────────────────────────────────

    /**
     * 직원 비밀번호를 초기화합니다. ADMIN 계정은 대상 제외.
     */
    @Transactional
    public UserResponse resetPassword(User requester, Long id, String newPassword) {
        assertCanManageEmployees(requester);
        User target = findInBrand(requester, id);
        assertNotAdmin(target);

        target.resetPassword(passwordEncoder.encode(newPassword));
        auditLogService.record(requester, AuditAction.EMPLOYEE_UPDATED, "EMPLOYEE", target.getId(),
                "비밀번호 초기화: " + target.getEmployeeCode());
        log.info("[User] 비밀번호 초기화 — by={}, target={}", requester.getEmployeeCode(), target.getEmployeeCode());
        return UserResponse.from(target);
    }

    // ── Code Rotation ────────────────────────────────────────────────

    /**
     * 직원 코드를 즉시 로테이션합니다.
     * ADMIN 계정은 대상 제외이며, 본사(HQ/ADMIN)만 호출할 수 있습니다.
     * 새 코드는 점별 코드 접두사를 유지하고 4자리 영문 + 1자리 특수문자를 무작위로 재생성합니다.
     */
    @Transactional
    public EmployeeCodeRotateResponse rotateEmployeeCode(User requester, Long id) {
        assertCanManageEmployees(requester);
        User target = findInBrand(requester, id);
        assertNotAdmin(target);

        String newCode = generateUniqueCode(target.getStoreCode());
        target.rotateCode(newCode);

        auditLogService.record(requester, AuditAction.EMPLOYEE_UPDATED, "EMPLOYEE", target.getId(),
                "코드 로테이션: " + newCode);
        log.info("[User] 코드 로테이션 — by={}, target={}, newCode={}", requester.getEmployeeCode(), id, newCode);

        return EmployeeCodeRotateResponse.builder()
                .newEmployeeCode(newCode)
                .rotatedAt(target.getCodeRotatedAt())
                .nextRotationAt(target.getCodeRotatedAt().plusDays(codeRotationDays))
                .build();
    }

    /**
     * 스케줄러 호출용: 로테이션 주기(codeRotationDays)가 지난 비-ADMIN 활성 계정의 코드를 자동 순환합니다.
     * 순환된 계정 수를 반환합니다.
     */
    @Transactional
    public int rotateExpiredCodes() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(codeRotationDays);
        List<User> targets = userRepository.findRotationTargets(UserRole.ADMIN, UserStatus.ACTIVE, threshold);

        int rotated = 0;
        for (User target : targets) {
            try {
                String newCode = generateUniqueCode(target.getStoreCode());
                target.rotateCode(newCode);
                rotated++;
                log.info("[User][Scheduler] 코드 자동 로테이션 — employeeId={}, newCode={}", target.getId(), newCode);
            } catch (Exception e) {
                log.warn("[User][Scheduler] 코드 로테이션 실패 — employeeId={}: {}", target.getId(), e.getMessage());
            }
        }
        return rotated;
    }

    // ── Approval ────────────────────────────────────────────────────

    /** 점장(또는 관리자)이 자신의 매장(관리자는 브랜드 전체)에서 승인 대기 중인 직원 목록을 조회합니다. */
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
        auditLogService.record(requester, AuditAction.EMPLOYEE_APPROVED, "EMPLOYEE", employee.getId(),
                "직원 승인: " + employee.getEmployeeCode());
        return UserResponse.from(employee);
    }

    /** 점장(또는 관리자)이 승인 대기 직원 계정을 거절합니다. */
    @Transactional
    public UserResponse rejectEmployee(User requester, Long employeeId, String reason) {
        User employee = findPendingTarget(requester, employeeId);
        employee.reject(requester.getId(), reason.trim(), LocalDateTime.now());
        log.info("[User] 직원 계정 거절 — rejectedBy={}, employeeCode={}, reason={}",
                requester.getEmployeeCode(), employee.getEmployeeCode(), reason.trim());
        auditLogService.record(requester, AuditAction.EMPLOYEE_REJECTED, "EMPLOYEE", employee.getId(),
                "직원 거절: " + employee.getEmployeeCode() + " - " + reason.trim());
        return UserResponse.from(employee);
    }

    // ── 내부 헬퍼 ────────────────────────────────────────────────────

    /** 점별 코드 접두사를 유지한 채 새 직원 코드를 중복 없이 생성합니다. */
    private String generateUniqueCode(String storeCode) {
        for (int i = 0; i < MAX_CODE_RETRY; i++) {
            String candidate = storeCode + randomSuffix();
            if (!userRepository.existsByEmployeeCode(candidate)) {
                return candidate;
            }
        }
        throw new CustomException(ErrorCode.EMPLOYEE_CODE_ROTATION_FAILED);
    }

    /** 영문 4자리 + 특수문자 1자리를 무작위로 생성합니다. */
    private String randomSuffix() {
        char[] buf = new char[5];
        for (int i = 0; i < 4; i++) {
            buf[i] = SUFFIX_CHARS.charAt(secureRandom.nextInt(SUFFIX_CHARS.length()));
        }
        buf[4] = SPECIAL_CHARS.charAt(secureRandom.nextInt(SPECIAL_CHARS.length()));
        return new String(buf);
    }

    private User findInBrand(User requester, Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getBrandId().equals(requester.getBrandId()))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private User findPendingTarget(User requester, Long employeeId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        assertCanApprove(requester, employee);
        if (!employee.isPending()) {
            throw new CustomException(ErrorCode.EMPLOYEE_NOT_PENDING);
        }
        return employee;
    }

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

    private boolean hasActiveManager(Long storeId) {
        return userRepository.existsByStoreIdAndRoleAndStatus(storeId, UserRole.STORE_MANAGER, UserStatus.ACTIVE);
    }

    private void assertCanManageEmployees(User user) {
        if (!user.getRole().canManage()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void assertCanAssignRole(User requester, UserRole targetRole) {
        if (targetRole == UserRole.ADMIN && requester.getRole() != UserRole.ADMIN) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void assertNotAdmin(User target) {
        if (target.isAdmin()) {
            throw new CustomException(ErrorCode.CANNOT_MODIFY_ADMIN);
        }
    }

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
