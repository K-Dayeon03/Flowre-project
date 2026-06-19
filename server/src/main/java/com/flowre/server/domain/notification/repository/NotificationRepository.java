package com.flowre.server.domain.notification.repository;

import com.flowre.server.domain.notification.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientIdAndBrandIdOrderByCreatedAtDesc(Long recipientId, Long brandId, Pageable pageable);

    List<Notification> findByRecipientIdAndBrandIdAndReadFalse(Long recipientId, Long brandId);

    long countByRecipientIdAndBrandIdAndReadFalse(Long recipientId, Long brandId);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);
}
