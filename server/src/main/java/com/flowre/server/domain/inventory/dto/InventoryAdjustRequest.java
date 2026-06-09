package com.flowre.server.domain.inventory.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InventoryAdjustRequest {

    @NotNull
    private Integer quantityChange;

    @NotNull
    private Long version;

    private String reason;
}
