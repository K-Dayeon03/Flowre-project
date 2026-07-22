package com.flowre.server.global.config;

import com.flowre.server.domain.audit.repository.AuditLogRepository;
import com.flowre.server.domain.chat.repository.ChatRoomMemberRepository;
import com.flowre.server.domain.chat.repository.ChatRoomRepository;
import com.flowre.server.domain.chat.repository.MessageRepository;
import com.flowre.server.domain.dashboard.repository.AsTicketRepository;
import com.flowre.server.domain.dashboard.repository.InquiryTicketRepository;
import com.flowre.server.domain.document.repository.DocumentRepository;
import com.flowre.server.domain.favorite.repository.FavoriteRepository;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.inventory.repository.InventoryTransactionRepository;
import com.flowre.server.domain.notice.repository.NoticeReadRepository;
import com.flowre.server.domain.notice.repository.NoticeRepository;
import com.flowre.server.domain.notification.repository.NotificationRepository;
import com.flowre.server.domain.schedule.repository.ScheduleRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String ADMIN_EMPLOYEE_CODE = "0000ADMN!";
    private static final String HEADQUARTERS_STORE_CODE = "0000";

    private final StoreRepository storeRepository;
    private final AuditLogRepository auditLogRepository;
    private final MessageRepository messageRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final NoticeReadRepository noticeReadRepository;
    private final NoticeRepository noticeRepository;
    private final FavoriteRepository favoriteRepository;
    private final NotificationRepository notificationRepository;
    private final DocumentRepository documentRepository;
    private final ScheduleRepository scheduleRepository;
    private final InquiryTicketRepository inquiryTicketRepository;
    private final AsTicketRepository asTicketRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryLabelRepository inventoryLabelRepository;
    private final UserRepository userRepository;

    @Value("${flowre.simulation.reset-on-start:true}")
    private boolean resetOnStart;

    @Override
    @Transactional
    public void run(String... args) {
        if (resetOnStart) {
            resetSimulationData();
        }

        Optional<Store> headquartersStore = storeRepository.findByBrandIdAndStoreCodeAndActiveTrue(1L, HEADQUARTERS_STORE_CODE);
        headquartersStore.ifPresent(store -> {
            store.updateCoordinates(37.5007, 127.0365);
            storeRepository.save(store);
        });
    }

    /**
     * 시뮬레이터 초기 상태를 만든다.
     * 운영 본부 매장(0000)과 부트스트랩 관리자(0000ADMN!)만 남기고 업무 데이터는 모두 비운다.
     */
    private void resetSimulationData() {
        noticeReadRepository.deleteAllInBatch();
        notificationRepository.deleteAllInBatch();
        favoriteRepository.deleteAllInBatch();
        messageRepository.deleteAllInBatch();
        chatRoomMemberRepository.deleteAllInBatch();
        chatRoomRepository.deleteAllInBatch();
        documentRepository.deleteAllInBatch();
        scheduleRepository.deleteAllInBatch();
        asTicketRepository.deleteAllInBatch();
        inquiryTicketRepository.deleteAllInBatch();
        inventoryTransactionRepository.deleteAllInBatch();
        inventoryItemRepository.deleteAllInBatch();
        inventoryLabelRepository.deleteAllInBatch();
        noticeRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();

        userRepository.deleteAllInBatch(userRepository.findAll()
                .stream()
                .filter(user -> !ADMIN_EMPLOYEE_CODE.equals(user.getEmployeeCode()))
                .toList());

        storeRepository.deleteAllInBatch(storeRepository.findAll()
                .stream()
                .filter(store -> !HEADQUARTERS_STORE_CODE.equals(store.getStoreCode()))
                .toList());

        log.info("[DataInitializer] 시뮬레이션 데이터 초기화 완료 — keep store={}, employee={}",
                HEADQUARTERS_STORE_CODE, ADMIN_EMPLOYEE_CODE);
    }
}
