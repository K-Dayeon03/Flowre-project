package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.StockStatus;
import com.flowre.server.domain.notification.entity.NotificationType;
import com.flowre.server.domain.notification.repository.NotificationRepository;
import com.flowre.server.domain.notification.service.NotificationService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserStatus;
import com.flowre.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 재고가 부족/소진 상태로 진입했을 때 매장 직원에게 알림을 보냅니다. */
@Service
@RequiredArgsConstructor
public class InventoryStockAlertNotifier {

    private static final String RELATED_TYPE = "INVENTORY_ITEM";

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    /** 정상 재고가 부족/소진으로 바뀐 경우 하루 한 번만 알림을 생성합니다. */
    public void notifyIfBecameAlert(InventoryItem item, StockStatus previousStatus) {
        StockStatus currentStatus = item.getStockStatus();
        if (!isAlert(currentStatus) || previousStatus == currentStatus) {
            return;
        }
        if (isAlert(previousStatus) && currentStatus != StockStatus.OUT_OF_STOCK) {
            return;
        }
        LocalDateTime today = LocalDateTime.now().toLocalDate().atStartOfDay();
        if (notificationRepository.existsByBrandIdAndTypeAndRelatedTypeAndRelatedIdAndCreatedAtAfter(
                item.getBrandId(), NotificationType.INVENTORY_LOW, RELATED_TYPE, item.getId(), today)) {
            return;
        }

        List<User> recipients = userRepository.findByStoreIdAndStatusOrderByCreatedAtAsc(
                item.getStoreId(), UserStatus.ACTIVE);
        String title = currentStatus == StockStatus.OUT_OF_STOCK ? "재고 소진" : "재고 부족";
        String message = item.getProductName() + " 재고가 " + item.getQuantity()
                + "개입니다. 최소 기준 " + item.getEffectiveMinQuantity() + "개를 확인해주세요.";
        notificationService.notifyAll(recipients, NotificationType.INVENTORY_LOW, title, message,
                RELATED_TYPE, item.getId());
    }

    private boolean isAlert(StockStatus status) {
        return status == StockStatus.OUT_OF_STOCK || status == StockStatus.LOW;
    }
}

