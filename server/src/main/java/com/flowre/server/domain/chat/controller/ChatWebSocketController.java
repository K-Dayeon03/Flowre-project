package com.flowre.server.domain.chat.controller;

import com.flowre.server.domain.chat.dto.MessageResponse;
import com.flowre.server.domain.chat.dto.SendMessageRequest;
import com.flowre.server.domain.chat.service.ChatService;
import com.flowre.server.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;

    /**
     * 클라이언트: client.publish({ destination: '/app/chat.send', body: JSON.stringify({...}) })
     * 브로드캐스트: /topic/room.{roomId} 구독자에게 전달
     */
    @MessageMapping("/chat.send")
    public void sendMessage(
            SendMessageRequest request,
            @AuthenticationPrincipal User user
    ) {
        log.debug("[STOMP] 메시지 수신 roomId={} senderId={}", request.getRoomId(), user.getId());
        chatService.sendStompMessage(user.getId(), request);
        // ChatService 내부에서 SimpMessagingTemplate으로 브로드캐스트
    }
}
