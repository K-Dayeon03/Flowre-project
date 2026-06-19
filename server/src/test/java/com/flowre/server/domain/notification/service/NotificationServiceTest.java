package com.flowre.server.domain.notification.service;

import com.flowre.server.domain.notification.entity.Notification;
import com.flowre.server.domain.notification.entity.NotificationType;
import com.flowre.server.domain.notification.repository.NotificationRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        notificationService = new NotificationService(notificationRepository);
    }

    @Test
    void notifyAllSavesOnePerRecipient() {
        List<User> managers = List.of(user(1L), user(2L));

        notificationService.notifyAll(managers, NotificationType.APPROVAL_REQUEST, "제목", "내용", "EMPLOYEE", 9L);

        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void notifyAllSkipsWhenNoRecipients() {
        notificationService.notifyAll(List.of(), NotificationType.GENERAL, "제목", "내용", null, null);

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void markReadFailsForOthersNotification() {
        User user = user(1L);
        when(notificationRepository.findByIdAndRecipientId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markRead(user, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    private User user(Long id) {
        return User.builder()
                .id(id)
                .email("u" + id + "@jaju.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("점장" + id)
                .role(UserRole.STORE_MANAGER)
                .brandId(1L)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
