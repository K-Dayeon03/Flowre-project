package com.flowre.server.domain.hub.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class HubSearchResultResponse {

    private String type;
    private Long resourceId;
    private String title;
    private String subtitle;
    private String createdAt;
}

