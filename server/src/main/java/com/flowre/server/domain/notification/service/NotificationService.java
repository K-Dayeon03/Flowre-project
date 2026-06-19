package com.flowre.server.domain.notification.service;

import com.flowre.server.domain.notification.dto.NotificationResponse;
import com.flowre.server.domain.notification.entity.Notification;
import com.flowre.server.domain.notification.entity.NotificationType;
import com.flowre.server.domain.notification.repository.NotificationRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 통합 알림 서비스.
 *
 * 인앱 알림(DB 저장 + 조회/읽음)과 FCM 푸시를 한 곳에서 처리해, 도메인별로 흩어지던
 * 알림 로직을 일원화한다. 현재 FCM 의존성은 비활성화되어 dispatchPush는 스텁으로 동작한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_LIMIT = 100;

    private final NotificationRepository notificationRepository;

    /** 단일 수신자에게 알림을 저장하고 푸시를 발송한다. */
    @Transactional
    public void notify(User recipient, NotificationType type, String title, String message,
                       String relatedType, Long relatedId) {
        notificationRepository.save(build(recipient, type, title, message, relatedType, relatedId));
        dispatchPush(List.of(recipient), title, message);
    }

    /** 여러 수신자에게 동일 알림을 저장하고 푸시를 발송한다. */
    @Transactional
    public void notifyAll(List<User> recipients, NotificationType type, String title, String message,
                          String relatedType, Long relatedId) {
        if (recipients.isEmpty()) {
            return;
        }
        recipients.forEach(recipient ->
                notificationRepository.save(build(recipient, type, title, message, relatedType, relatedId)));
        dispatchPush(recipients, title, message);
    }

    /** 내 알림 목록을 최신순으로 조회한다. */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(User user, int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(1, limit), MAX_LIMIT));
        return notificationRepository
                .findByRecipientIdAndBrandIdOrderByCreatedAtDesc(user.getId(), user.getBrandId(), pageable)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    /** 내 안읽음 알림 수를 반환한다. */
    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientIdAndBrandIdAndReadFalse(user.getId(), user.getBrandId());
    }

    /** 내 알림 한 건을 읽음 처리한다. 남의 알림이면 NOTIFICATION_NOT_FOUND. */
    @Transactional
    public void markRead(User user, Long id) {
        Notification notification = notificationRepository.findByIdAndRecipientId(id, user.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markRead();
    }

    /** 내 모든 안읽음 알림을 읽음 처리한다. */
    @Transactional
    public void markAllRead(User user) {
        notificationRepository.findByRecipientIdAndBrandIdAndReadFalse(user.getId(), user.getBrandId())
                .forEach(Notification::markRead);
    }

    private Notification build(User recipient, NotificationType type, String title, String message,
                              String relatedType, Long relatedId) {
        return Notification.builder()
                .brandId(recipient.getBrandId())
                .recipientId(recipient.getId())
                .type(type)
                .title(title)
                .message(message)
                .relatedType(relatedType)
                .relatedId(relatedId)
                .build();
    }

    /**
     * FCM 푸시 발송 지점. 현재는 대상·메시지를 로깅만 한다.
     * 실제 FCM 연동 시 이 메서드 본문을 FirebaseMessaging 호출로 교체한다.
     */
    private void dispatchPush(List<User> recipients, String title, String body) {
        List<String> tokens = recipients.stream()
                .map(User::getFcmToken)
                .filter(token -> token != null && !token.isBlank())
                .toList();
        log.info("[Notification] FCM 푸시 발송(stub) — 대상 토큰 {}건, title={}", tokens.size(), title);
    }
}
