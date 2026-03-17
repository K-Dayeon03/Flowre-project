package com.flowre.server.domain.chat.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat_room_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"chat_room_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatRoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String userName;

    private java.time.LocalDateTime lastReadAt;

    public void updateLastReadAt() {
        this.lastReadAt = java.time.LocalDateTime.now();
    }
}
