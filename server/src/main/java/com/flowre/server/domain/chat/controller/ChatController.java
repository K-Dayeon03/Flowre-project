package com.flowre.server.domain.chat.controller;

import com.flowre.server.domain.chat.dto.ChatRoomResponse;
import com.flowre.server.domain.chat.dto.CreateDirectRoomRequest;
import com.flowre.server.domain.chat.dto.MessageResponse;
import com.flowre.server.domain.chat.dto.SendMessageRequest;
import com.flowre.server.domain.chat.service.ChatService;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /** GET /api/chat/rooms */
    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<ChatRoomResponse>>> getRooms(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getRooms(user)));
    }

    /** GET /api/chat/rooms/{roomId}/messages?before=100&limit=50 */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getMessages(
            @AuthenticationPrincipal User user,
            @PathVariable Long roomId,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                chatService.getMessages(user, roomId, before, limit)));
    }

    /** POST /api/chat/rooms/direct */
    @PostMapping("/rooms/direct")
    public ResponseEntity<ApiResponse<ChatRoomResponse>> createDirectRoom(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateDirectRoomRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.createDirectRoom(user, request)));
    }

    /** POST /api/chat/rooms/{roomId}/messages — STOMP 불가 시 REST fallback */
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.sendMessage(user, request)));
    }

    /** POST /api/chat/rooms/{roomId}/read */
    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long roomId
    ) {
        chatService.markRead(user, roomId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
