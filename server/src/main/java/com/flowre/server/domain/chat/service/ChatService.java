package com.flowre.server.domain.chat.service;

import com.flowre.server.domain.chat.dto.ChatRoomResponse;
import com.flowre.server.domain.chat.dto.CreateDirectRoomRequest;
import com.flowre.server.domain.chat.dto.MessageResponse;
import com.flowre.server.domain.chat.dto.SendMessageRequest;
import com.flowre.server.domain.chat.entity.*;
import com.flowre.server.domain.chat.repository.ChatRoomMemberRepository;
import com.flowre.server.domain.chat.repository.ChatRoomRepository;
import com.flowre.server.domain.chat.repository.MessageRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 내가 속한 채팅방 목록 조회
     */
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getRooms(User user) {
        List<ChatRoom> rooms = chatRoomRepository.findAllByMemberUserId(user.getId());
        return rooms.stream().map(room -> {
            List<Message> msgs = messageRepository.findByRoomIdOrderBySentAtAsc(room.getId());
            Message last = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1);

            int unread = chatRoomMemberRepository
                    .findByChatRoomIdAndUserId(room.getId(), user.getId())
                    .map(m -> {
                        if (m.getLastReadAt() == null) return msgs.size();
                        return (int) msgs.stream()
                                .filter(msg -> msg.getSentAt() != null
                                        && msg.getSentAt().isAfter(m.getLastReadAt()))
                                .count();
                    }).orElse(0);

            return ChatRoomResponse.of(room, last, unread);
        }).toList();
    }

    /**
     * 메시지 목록 조회 (커서 기반)
     */
    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(User user, Long roomId, Long before, int limit) {
        validateMember(roomId, user.getId());

        List<Message> messages = before != null
                ? messageRepository.findByRoomIdAndIdLessThanOrderBySentAtDesc(
                        roomId, before, PageRequest.of(0, limit))
                : messageRepository.findByRoomIdOrderBySentAtAsc(roomId);

        return messages.stream()
                .map(m -> MessageResponse.of(m, user.getId()))
                .toList();
    }

    /**
     * 1:1 채팅방 생성
     * - STORE_STAFF: 같은 매장 직원끼리만
     * - STORE_MANAGER: 같은 매장 + HQ_STAFF 가능
     */
    @Transactional
    public ChatRoomResponse createDirectRoom(User me, CreateDirectRoomRequest request) {
        User target = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        validateDirectRoomPermission(me, target);

        // 이미 있는 1:1 방이면 반환
        return chatRoomRepository.findDirectRoom(me.getId(), target.getId())
                .map(room -> ChatRoomResponse.of(room, null, 0))
                .orElseGet(() -> {
                    ChatRoom room = ChatRoom.builder()
                            .type(RoomType.DIRECT)
                            .name(target.getName())
                            .build();
                    ChatRoom saved = chatRoomRepository.save(room);

                    addMember(saved, me);
                    addMember(saved, target);

                    return ChatRoomResponse.of(saved, null, 0);
                });
    }

    /**
     * REST fallback 메시지 전송 (STOMP 불가 시)
     */
    @Transactional
    public MessageResponse sendMessage(User user, SendMessageRequest request) {
        validateMember(request.getRoomId(), user.getId());

        Message message = Message.builder()
                .roomId(request.getRoomId())
                .senderId(user.getId())
                .senderName(user.getName())
                .content(request.getContent())
                .type(request.getType())
                .build();

        Message saved = messageRepository.save(message);
        MessageResponse response = MessageResponse.of(saved, user.getId());

        // STOMP 브로커로도 발행 — 연결된 구독자에게 전달
        messagingTemplate.convertAndSend("/topic/room." + request.getRoomId(), response);

        return response;
    }

    /**
     * STOMP 메시지 전송 (WebSocket 핸들러에서 호출)
     */
    @Transactional
    public MessageResponse sendStompMessage(Long senderId, SendMessageRequest request) {
        User user = userRepository.findById(senderId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return sendMessage(user, request);
    }

    /**
     * 채팅방 읽음 처리
     */
    @Transactional
    public void markRead(User user, Long roomId) {
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, user.getId())
                .ifPresent(ChatRoomMember::updateLastReadAt);
    }

    // ── private helpers ──────────────────────────────────────────

    private void validateMember(Long roomId, Long userId) {
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void addMember(ChatRoom room, User user) {
        ChatRoomMember member = ChatRoomMember.builder()
                .chatRoom(room)
                .userId(user.getId())
                .userName(user.getName())
                .build();
        chatRoomMemberRepository.save(member);
    }

    private void validateDirectRoomPermission(User me, User target) {
        if (me.getRole() == UserRole.STORE_STAFF) {
            // 일반 직원: 같은 매장 직원끼리만
            if (!me.getStoreId().equals(target.getStoreId())) {
                throw new CustomException(ErrorCode.DIRECT_ROOM_NOT_ALLOWED);
            }
        } else if (me.getRole() == UserRole.STORE_MANAGER) {
            // 점장: 같은 매장 직원 or 본사 직원
            boolean sameStore = me.getStoreId().equals(target.getStoreId());
            boolean isHq = target.getRole() == UserRole.HQ_STAFF;
            if (!sameStore && !isHq) {
                throw new CustomException(ErrorCode.DIRECT_ROOM_NOT_ALLOWED);
            }
        }
        // HQ_STAFF, ADMIN은 제한 없음
    }
}
