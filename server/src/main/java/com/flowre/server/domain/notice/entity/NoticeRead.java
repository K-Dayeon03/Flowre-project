package com.flowre.server.domain.notice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notice_reads",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_notice_read_notice_user", columnNames = {"notice_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_notice_reads_user", columnList = "user_id, notice_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class NoticeRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long noticeId;

    @Column(nullable = false)
    private Long userId;

    @CreatedDate
    private LocalDateTime readAt;
}
