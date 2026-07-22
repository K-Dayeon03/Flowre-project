package com.flowre.server.domain.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class HomeDashboardResponse {

    private List<RecentInquiryResponse> recentInquiries;
    private AsStatusResponse asStatus;
}
