package com.flowre.server.domain.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InventoryArchiveRequest {

    @NotBlank
    private String labelName;

    @NotBlank
    private String archiveItemName;

    @NotNull
    @Min(0)
    private Integer archiveQuantity;
}
