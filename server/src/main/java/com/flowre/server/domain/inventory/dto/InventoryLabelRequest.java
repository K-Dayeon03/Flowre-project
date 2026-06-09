package com.flowre.server.domain.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InventoryLabelRequest {

    @NotBlank
    private String name;
}
