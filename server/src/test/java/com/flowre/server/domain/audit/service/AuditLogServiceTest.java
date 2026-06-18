package com.flowre.server.domain.audit.service;

import com.flowre.server.domain.audit.dto.AuditLogResponse;
import com.flowre.server.domain.audit.entity.AuditAction;
import com.flowre.server.domain.audit.entity.AuditLog;
import com.flowre.server.domain.audit.repository.AuditLogRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuditLogServiceTest {

    private AuditLogRepository auditLogRepository;
    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        auditLogRepository = mock(AuditLogRepository.class);
        auditLogService = new AuditLogService(auditLogRepository);
    }

    @Test
    void recordSavesLogWithActorContext() {
        User actor = user(7L, 1L, UserRole.HQ_STAFF);

        auditLogService.record(actor, AuditAction.INVENTORY_DEDUCTED, "INVENTORY_ITEM", 99L, "3개 차감");

        verify(auditLogRepository).save(argThat(log ->
                log.getBrandId().equals(1L)
                        && log.getActorId().equals(7L)
                        && log.getAction() == AuditAction.INVENTORY_DEDUCTED
                        && log.getTargetId().equals(99L)));
    }

    @Test
    void getLogsForbiddenForStoreStaff() {
        User staff = user(7L, 1L, UserRole.STORE_STAFF);

        assertThatThrownBy(() -> auditLogService.getLogs(staff, null, 100))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(auditLogRepository, never()).findByBrandIdOrderByCreatedAtDesc(any(), any());
    }

    @Test
    void getLogsReturnsBrandScopedLogsForHq() {
        User hq = user(7L, 1L, UserRole.HQ_STAFF);
        when(auditLogRepository.findByBrandIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class)))
                .thenReturn(List.of(log(1L, AuditAction.SCHEDULE_COMPLETED)));

        List<AuditLogResponse> result = auditLogService.getLogs(hq, null, 100);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAction()).isEqualTo("SCHEDULE_COMPLETED");
    }

    private AuditLog log(Long id, AuditAction action) {
        return AuditLog.builder()
                .id(id)
                .brandId(1L)
                .actorId(7L)
                .actorName("본사 직원")
                .action(action)
                .targetType("SCHEDULE")
                .targetId(5L)
                .detail("상세")
                .build();
    }

    private User user(Long id, Long brandId, UserRole role) {
        return User.builder()
                .id(id)
                .email("u@jaju.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("사용자")
                .role(role)
                .brandId(brandId)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
