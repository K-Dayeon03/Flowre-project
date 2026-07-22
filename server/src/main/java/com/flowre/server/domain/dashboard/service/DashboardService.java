package com.flowre.server.domain.dashboard.service;

import com.flowre.server.domain.dashboard.dto.AsStatusResponse;
import com.flowre.server.domain.dashboard.dto.HomeDashboardResponse;
import com.flowre.server.domain.dashboard.dto.RecentInquiryResponse;
import com.flowre.server.domain.dashboard.entity.AsTicket;
import com.flowre.server.domain.dashboard.entity.AsTicketPriority;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import com.flowre.server.domain.dashboard.entity.InquiryTicket;
import com.flowre.server.domain.dashboard.repository.AsTicketRepository;
import com.flowre.server.domain.dashboard.repository.InquiryTicketRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 홈 대시보드에 필요한 요약 데이터를 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InquiryTicketRepository inquiryTicketRepository;
    private final AsTicketRepository asTicketRepository;

    public HomeDashboardResponse getHome(User user, int limit) {
        boolean brandScope = user.getRole() == UserRole.HQ_STAFF || user.getRole() == UserRole.ADMIN;
        int pageSize = Math.max(1, Math.min(limit, 10));

        List<InquiryTicket> inquiries = brandScope
                ? inquiryTicketRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId(), PageRequest.of(0, pageSize))
                : inquiryTicketRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(user.getBrandId(), user.getStoreId(), PageRequest.of(0, pageSize));

        List<AsTicket> asTickets = brandScope
                ? asTicketRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId(), PageRequest.of(0, pageSize))
                : asTicketRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(user.getBrandId(), user.getStoreId(), PageRequest.of(0, pageSize));

        long newCount = asTickets.stream().filter(ticket -> ticket.getStatus() == AsTicketStatus.NEW).count();
        long inProgressCount = asTickets.stream().filter(ticket -> ticket.getStatus() == AsTicketStatus.IN_PROGRESS).count();
        long doneCount = asTickets.stream().filter(ticket -> ticket.getStatus() == AsTicketStatus.DONE).count();
        long urgentCount = asTickets.stream().filter(ticket -> ticket.getPriority() == AsTicketPriority.URGENT).count();
        int completionRate = asTickets.isEmpty() ? 0 : (int) Math.round((doneCount * 100.0) / asTickets.size());

        return HomeDashboardResponse.builder()
                .recentInquiries(inquiries.stream().map(RecentInquiryResponse::from).toList())
                .asStatus(AsStatusResponse.builder()
                        .newCount(newCount)
                        .inProgressCount(inProgressCount)
                        .doneCount(doneCount)
                        .urgentCount(urgentCount)
                        .completionRate(completionRate)
                        .updatedAt(LocalDateTime.now())
                        .build())
                .build();
    }
}
