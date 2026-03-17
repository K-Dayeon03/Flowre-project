package com.flowre.server.domain.schedule.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ScheduleStatus status = ScheduleStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime dueDate;

    // 담당자 이름 (비정규화 — 조회 성능 우선)
    private String assignee;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private Long brandId;

    @Column(columnDefinition = "TEXT")
    private String description;

    // 생성자 이름 (비정규화)
    @Column(nullable = false)
    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    public void complete() {
        this.status = ScheduleStatus.DONE;
    }

    public void update(String title, ScheduleType type, LocalDateTime dueDate,
                       String assignee, String description) {
        if (title != null) this.title = title;
        if (type != null) this.type = type;
        if (dueDate != null) this.dueDate = dueDate;
        if (assignee != null) this.assignee = assignee;
        if (description != null) this.description = description;
    }
}
