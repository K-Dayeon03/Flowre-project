package com.flowre.server.domain.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateRoomRequest {

    @NotBlank
    @Size(max = 50)
    private String name;
}
