package com.flowre.server.domain.user.repository;

import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployeeCode(String employeeCode);
    boolean existsByEmail(String email);
    boolean existsByEmployeeCode(String employeeCode);
    List<User> findByBrandIdOrderByEmployeeCodeAsc(Long brandId);

    /** 매장에 특정 역할·상태의 직원이 존재하는지 확인합니다. (활성 점장 존재 여부 판단용) */
    boolean existsByStoreIdAndRoleAndStatus(Long storeId, UserRole role, UserStatus status);

    /** 특정 매장의 특정 상태 직원 목록을 등록순으로 조회합니다. (점장 승인 대기 목록용) */
    List<User> findByStoreIdAndStatusOrderByCreatedAtAsc(Long storeId, UserStatus status);

    /** 특정 브랜드의 특정 상태 직원 목록을 등록순으로 조회합니다. (관리자 승인 대기 목록용) */
    List<User> findByBrandIdAndStatusOrderByCreatedAtAsc(Long brandId, UserStatus status);

    /** 특정 매장의 특정 역할·상태 직원 목록을 조회합니다. (승인 요청 알림 대상 = 활성 점장) */
    List<User> findByStoreIdAndRoleAndStatus(Long storeId, UserRole role, UserStatus status);

    /**
     * 코드 로테이션 대상 계정을 조회합니다.
     * ADMIN 역할은 제외하고, 마지막 로테이션이 기준일 이전이거나 한 번도 로테이션되지 않은 활성 계정을 반환합니다.
     */
    @Query("""
            select u from User u
            where u.role != :adminRole
              and u.status = :activeStatus
              and (u.codeRotatedAt is null or u.codeRotatedAt < :threshold)
            """)
    List<User> findRotationTargets(
            @Param("adminRole") UserRole adminRole,
            @Param("activeStatus") UserStatus activeStatus,
            @Param("threshold") LocalDateTime threshold
    );
}
