package com.flowre.server.domain.chat.service;

import com.flowre.server.domain.chat.dto.ChatRoomResponse;
import com.flowre.server.domain.chat.dto.CreateDirectRoomRequest;
import com.flowre.server.domain.chat.dto.CreateRoomRequest;
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

import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

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
        List<ChatRoom> rooms = chatRoomRepository
                .findAllByMemberUserIdAndBrandId(user.getId(), user.getBrandId());
        if (rooms.isEmpty()) {
            return List.of();
        }

        List<Long> roomIds = rooms.stream().map(ChatRoom::getId).toList();

        // 방별 마지막 메시지 / 안읽음 수를 각각 한 번의 쿼리로 일괄 조회해 N+1을 제거한다.
        Map<Long, Message> lastByRoom = messageRepository.findLatestPerRoom(roomIds).stream()
                .collect(Collectors.toMap(Message::getRoomId, m -> m, (a, b) -> a));
        Map<Long, Integer> unreadByRoom = messageRepository.countUnreadPerRoom(user.getId(), roomIds).stream()
                .collect(Collectors.toMap(
                        MessageRepository.UnreadCount::getRoomId,
                        u -> (int) Math.min(u.getCnt(), Integer.MAX_VALUE)));

        return rooms.stream()
                .map(room -> ChatRoomResponse.of(
                        room,
                        lastByRoom.get(room.getId()),
                        unreadByRoom.getOrDefault(room.getId(), 0)))
                .toList();
    }

    /**
     * 메시지 목록 조회 (커서 기반)
     */
    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(User user, Long roomId, Long before, int limit) {
        getMemberRoom(roomId, user);
        int pageSize = Math.max(1, limit);

        List<Message> messages = before != null
                ? messageRepository.findByRoomIdAndIdLessThanOrderByIdDesc(
                        roomId, before, PageRequest.of(0, pageSize))
                : messageRepository.findByRoomIdOrderByIdDesc(roomId, PageRequest.of(0, pageSize));

        // 화면 표시는 오래된→최신(id 오름차순). 커서·정렬 모두 id 기준이라 누락/중복이 없다.
        return messages.stream()
                .sorted(Comparator.comparing(Message::getId, Comparator.nullsFirst(Long::compareTo)))
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
        String directRoomKey = directRoomKey(me.getId(), target.getId());

        // 이미 있는 1:1 방이면 반환
        return chatRoomRepository.findByTypeAndDirectRoomKey(RoomType.DIRECT, directRoomKey)
                .or(() -> chatRoomRepository.findDirectRoom(me.getId(), target.getId()))
                .map(room -> ChatRoomResponse.of(room, null, 0))
                .orElseGet(() -> {
                    ChatRoom room = ChatRoom.builder()
                            .type(RoomType.DIRECT)
                            .brandId(me.getBrandId())
                            .name(target.getName())
                            .directRoomKey(directRoomKey)
                            .build();
                    ChatRoom saved = chatRoomRepository.saveAndFlush(room);

                    addMember(saved, me);
                    addMember(saved, target);

                    return ChatRoomResponse.of(saved, null, 0);
                });
    }

    /**
     * 여러 사용자가 참여하는 다자 채팅방을 생성합니다.
     * 1:n, N:1 모두 참여자 목록을 가진 GROUP 방으로 처리합니다.
     */
    @Transactional
    public ChatRoomResponse createRoom(User me, CreateRoomRequest request) {
        Set<Long> memberIds = new LinkedHashSet<>(request.getMemberUserIds());
        memberIds.add(me.getId());

        List<User> members = memberIds.stream()
                .map(memberId -> userRepository.findById(memberId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND)))
                .peek(member -> validateGroupRoomMember(me, member))
                .toList();

        ChatRoom room = ChatRoom.builder()
                .type(RoomType.GROUP)
                .brandId(me.getBrandId())
                .name(request.getName().trim())
                .storeId(me.getStoreId())
                .build();
        ChatRoom saved = chatRoomRepository.save(room);

        for (User member : members) {
            addMember(saved, member);
        }

        return ChatRoomResponse.of(saved, null, 0);
    }

    /**
     * REST fallback 메시지 전송 (STOMP 불가 시)
     */
    @Transactional
    public MessageResponse sendMessage(User user, SendMessageRequest request) {
        getMemberRoom(request.getRoomId(), user);

        Message message = Message.builder()
                .roomId(request.getRoomId())
                .senderId(user.getId())
                .senderName(user.getName())
                .content(request.getContent())
                .type(request.getType())
                .fileName(request.getFileName())
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
        getMemberRoom(roomId, user);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, user.getId())
                .ifPresent(ChatRoomMember::updateLastReadAt);
    }

    // ── private helpers ──────────────────────────────────────────

    /**
     * 채팅방 접근 권한 검증 — 브랜드 격리(타 브랜드 방 차단) + 멤버십 확인을 함께 수행한다.
     *
     * @return 검증을 통과한 채팅방
     */
    private ChatRoom getMemberRoom(Long roomId, User user) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));
        if (!Objects.equals(room.getBrandId(), user.getBrandId())
                || !chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, user.getId())) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
        return room;
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
        if (!Objects.equals(me.getBrandId(), target.getBrandId())) {
            throw new CustomException(ErrorCode.DIRECT_ROOM_NOT_ALLOWED);
        }
        if (me.getRole() == UserRole.STORE_STAFF) {
            // 일반 직원: 같은 매장 직원끼리만
            if (!Objects.equals(me.getStoreId(), target.getStoreId())) {
                throw new CustomException(ErrorCode.DIRECT_ROOM_NOT_ALLOWED);
            }
        } else if (me.getRole() == UserRole.STORE_MANAGER) {
            // 점장: 같은 매장 직원 or 본사 직원
            boolean sameStore = Objects.equals(me.getStoreId(), target.getStoreId());
            boolean isHq = target.getRole() == UserRole.HQ_STAFF;
            if (!sameStore && !isHq) {
                throw new CustomException(ErrorCode.DIRECT_ROOM_NOT_ALLOWED);
            }
        }
        // HQ_STAFF, ADMIN은 제한 없음
    }

    private void validateGroupRoomMember(User me, User member) {
        if (!Objects.equals(me.getBrandId(), member.getBrandId())
                || !Objects.equals(me.getStoreId(), member.getStoreId())) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private String directRoomKey(Long userId1, Long userId2) {
        long first = Math.min(userId1, userId2);
        long second = Math.max(userId1, userId2);
        return first + ":" + second;
    }
}
