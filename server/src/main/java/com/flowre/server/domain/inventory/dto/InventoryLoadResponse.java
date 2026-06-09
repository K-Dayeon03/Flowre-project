package com.flowre.server.domain.inventory.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class InventoryLoadResponse {

    private int fileCount;
    private int rowCount;
    private int createdCount;
    private int updatedCount;
    private int skippedCount;
    private List<String> fileNames;
}
