package com.flowre.server.domain.sales.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SalesUploadResponse {

    private Integer rowCount;
    private Integer skippedCount;
}

