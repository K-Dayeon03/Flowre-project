package com.flowre.server.domain.chat.service;

import com.flowre.server.domain.chat.dto.CreateDirectRoomRequest;
import com.flowre.server.domain.chat.dto.CreateRoomRequest;
import com.flowre.server.domain.chat.dto.MessageResponse;
import com.flowre.server.domain.chat.entity.ChatRoom;
import com.flowre.server.domain.chat.entity.ChatRoomMember;
import com.flowre.server.domain.chat.entity.Message;
import com.flowre.server.domain.chat.entity.MessageType;
import com.flowre.server.domain.chat.entity.RoomType;
import com.flowre.server.domain.chat.repository.ChatRoomMemberRepository;
import com.flowre.server.domain.chat.repository.ChatRoomRepository;
import com.flowre.server.domain.chat.repository.MessageRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.domain.user.repository.UserRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatServiceTest {

    private ChatRoomRepository chatRoomRepository;
    private ChatRoomMemberRepository chatRoomMemberRepository;
    private MessageRepository messageRepository;
    private UserRepository userRepository;
    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatRoomRepository = mock(ChatRoomRepository.class);
        chatRoomMemberRepository = mock(ChatRoomMemberRepository.class);
        messageRepository = mock(MessageRepository.class);
        userRepository = mock(UserRepository.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        chatService = new ChatService(
                chatRoomRepository,
                chatRoomMemberRepository,
                messageRepository,
                userRepository,
                messagingTemplate
        );
    }

    @Test
    void getMessagesLoadsLatestPageAndReturnsAscendingOrder() {
        User user = user(1L, 1L, 1001L, UserRole.STORE_STAFF);
        LocalDateTime base = LocalDateTime.of(2026, 6, 18, 10, 0);
        Message newer = message(3L, base.plusMinutes(2));
        Message older = message(2L, base.plusMinutes(1));

        when(chatRoomRepository.findById(10L)).thenReturn(Optional.of(room(10L, 1L)));
        when(chatRoomMemberRepository.existsByChatRoomIdAndUserId(10L, 1L)).thenReturn(true);
        when(messageRepository.findByRoomIdOrderByIdDesc(eq(10L), any(Pageable.class)))
                .thenReturn(List.of(newer, older));

        List<MessageResponse> responses = chatService.getMessages(user, 10L, null, 20);

        assertThat(responses).extracting(MessageResponse::getId).containsExactly(2L, 3L);
    }

    @Test
    void getMessagesRejectsRoomFromDifferentBrand() {
        User user = user(1L, 1L, 1001L, UserRole.STORE_STAFF);
        // 다른 브랜드(2L) 소속 채팅방 — 멤버십과 무관하게 brand 불일치로 차단되어야 함
        when(chatRoomRepository.findById(10L)).thenReturn(Optional.of(room(10L, 2L)));

        assertThatThrownBy(() -> chatService.getMessages(user, 10L, null, 20))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(chatRoomMemberRepository, never()).existsByChatRoomIdAndUserId(any(), any());
    }

    @Test
    void getRoomsFiltersByRequesterBrand() {
        User user = user(1L, 1L, 1001L, UserRole.STORE_STAFF);
        when(chatRoomRepository.findAllByMemberUserIdAndBrandId(1L, 1L)).thenReturn(List.of());

        chatService.getRooms(user);

        verify(chatRoomRepository).findAllByMemberUserIdAndBrandId(1L, 1L);
    }

    @Test
    void createRoomStoresRequesterBrandId() {
        User me = user(1L, 1L, 1001L, UserRole.STORE_MANAGER);
        User member = user(2L, 1L, 1001L, UserRole.STORE_STAFF);
        CreateRoomRequest request = createRoomRequest("강남점 업무방", List.of(2L));

        when(userRepository.findById(1L)).thenReturn(Optional.of(me));
        when(userRepository.findById(2L)).thenReturn(Optional.of(member));
        when(chatRoomRepository.save(any(ChatRoom.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        chatService.createRoom(me, request);

        verify(chatRoomRepository).save(argThat(room -> room.getBrandId().equals(1L)));
    }

    @Test
    void createRoomRejectsMemberFromDifferentStoreBeforeSavingRoom() {
        User me = user(1L, 1L, 1001L, UserRole.STORE_MANAGER);
        User otherStore = user(2L, 1L, 1002L, UserRole.STORE_STAFF);
        CreateRoomRequest request = createRoomRequest("강남점 업무방", List.of(2L));

        when(userRepository.findById(2L)).thenReturn(Optional.of(otherStore));
        when(userRepository.findById(1L)).thenReturn(Optional.of(me));

        assertThatThrownBy(() -> chatService.createRoom(me, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(chatRoomRepository, never()).save(any(ChatRoom.class));
    }

    @Test
    void createDirectRoomStoresSortedDirectRoomKey() {
        User me = user(2L, 1L, 1001L, UserRole.STORE_STAFF);
        User target = user(1L, 1L, 1001L, UserRole.STORE_STAFF);
        CreateDirectRoomRequest request = createDirectRoomRequest(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(target));
        when(chatRoomRepository.findByTypeAndDirectRoomKey(RoomType.DIRECT, "1:2"))
                .thenReturn(Optional.empty());
        when(chatRoomRepository.saveAndFlush(any(ChatRoom.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(chatRoomMemberRepository.save(any(ChatRoomMember.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        chatService.createDirectRoom(me, request);

        verify(chatRoomRepository).saveAndFlush(argThat(room ->
                room.getType() == RoomType.DIRECT
                        && "1:2".equals(room.getDirectRoomKey())
        ));
    }

    private CreateRoomRequest createRoomRequest(String name, List<Long> memberUserIds) {
        CreateRoomRequest request = new CreateRoomRequest();
        ReflectionTestUtils.setField(request, "name", name);
        ReflectionTestUtils.setField(request, "memberUserIds", memberUserIds);
        return request;
    }

    private CreateDirectRoomRequest createDirectRoomRequest(Long targetUserId) {
        CreateDirectRoomRequest request = new CreateDirectRoomRequest();
        ReflectionTestUtils.setField(request, "targetUserId", targetUserId);
        return request;
    }

    private Message message(Long id, LocalDateTime sentAt) {
        return Message.builder()
                .id(id)
                .roomId(10L)
                .senderId(1L)
                .senderName("테스트 사용자")
                .content("메시지")
                .type(MessageType.TEXT)
                .sentAt(sentAt)
                .build();
    }

    private ChatRoom room(Long id, Long brandId) {
        return ChatRoom.builder()
                .id(id)
                .type(RoomType.GROUP)
                .brandId(brandId)
                .name("테스트 채팅방")
                .storeId(1001L)
                .build();
    }

    private User user(Long id, Long brandId, Long storeId, UserRole role) {
        return User.builder()
                .id(id)
                .email("user" + id + "@jaju.com")
                .employeeCode("1001ABCD!")
                .password("encoded-password")
                .name("테스트 사용자" + id)
                .role(role)
                .brandId(brandId)
                .storeId(storeId)
                .storeCode(String.valueOf(storeId))
                .storeName("테스트 매장")
                .build();
    }
}
