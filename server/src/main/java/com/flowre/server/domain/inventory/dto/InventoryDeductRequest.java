package com.flowre.server.domain.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InventoryDeductRequest {

    @NotNull
    @Min(1)
    private Integer quantity;

    @NotNull
    private Long version;

    private String reason;
}
