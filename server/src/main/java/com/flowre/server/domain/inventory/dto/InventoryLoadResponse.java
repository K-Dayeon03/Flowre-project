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
    /** 전체 교체 시 파일에 없어 수량을 0으로 만든 기존(비보관) 항목 수 */
    private int zeroedCount;
    private List<String> fileNames;
}
