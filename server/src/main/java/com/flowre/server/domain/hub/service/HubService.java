package com.flowre.server.domain.hub.service;

import com.flowre.server.domain.chat.repository.ChatRoomRepository;
import com.flowre.server.domain.chat.repository.MessageRepository;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import com.flowre.server.domain.dashboard.repository.AsTicketRepository;
import com.flowre.server.domain.dashboard.repository.InquiryTicketRepository;
import com.flowre.server.domain.document.entity.Document;
import com.flowre.server.domain.document.repository.DocumentRepository;
import com.flowre.server.domain.hub.dto.HubSearchResultResponse;
import com.flowre.server.domain.hub.dto.HubSummaryResponse;
import com.flowre.server.domain.notice.entity.Notice;
import com.flowre.server.domain.notice.repository.NoticeReadRepository;
import com.flowre.server.domain.notice.repository.NoticeRepository;
import com.flowre.server.domain.notification.service.NotificationService;
import com.flowre.server.domain.schedule.entity.Schedule;
import com.flowre.server.domain.schedule.entity.ScheduleStatus;
import com.flowre.server.domain.schedule.repository.ScheduleRepository;
import com.flowre.server.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** 본사-매장 커뮤니케이션 허브 요약과 통합 검색을 제공합니다. */
@Service
@RequiredArgsConstructor
public class HubService {

    private final NoticeRepository noticeRepository;
    private final NoticeReadRepository noticeReadRepository;
    private final DocumentRepository documentRepository;
    private final ScheduleRepository scheduleRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final InquiryTicketRepository inquiryTicketRepository;
    private final AsTicketRepository asTicketRepository;
    private final NotificationService notificationService;

    /** 허브 상단 요약 데이터를 조회합니다. */
    @Transactional(readOnly = true)
    public HubSummaryResponse getSummary(User user) {
        List<Notice> notices = noticeRepository.findByBrandIdOrderByPinnedDescCreatedAtDesc(user.getBrandId());
        List<Long> noticeIds = notices.stream().map(Notice::getId).toList();
        long readNoticeCount = noticeIds.isEmpty() ? 0 : noticeReadRepository.countByUserIdAndNoticeIdIn(user.getId(), noticeIds);
        long unreadNoticeCount = Math.max(0, noticeIds.size() - readNoticeCount);

        List<Long> roomIds = chatRoomRepository.findAllByMemberUserIdAndBrandId(user.getId(), user.getBrandId())
                .stream()
                .map(room -> room.getId())
                .toList();
        long unreadChatCount = roomIds.isEmpty()
                ? 0
                : messageRepository.countUnreadPerRoom(user.getId(), roomIds).stream().mapToLong(MessageRepository.UnreadCount::getCnt).sum();

        long pendingScheduleCount = user.getRole().canViewAllStores()
                ? scheduleRepository.findByBrandIdAndStatusOrderByCreatedAtDesc(user.getBrandId(), ScheduleStatus.PENDING).size()
                : scheduleRepository.findByBrandIdAndStoreIdAndStatusOrderByCreatedAtDesc(
                        user.getBrandId(), user.getStoreId(), ScheduleStatus.PENDING).size();
        long pendingInquiryCount = user.getRole().canViewAllStores()
                ? inquiryTicketRepository.countByBrandIdAndStatusNot(user.getBrandId(), InquiryStatus.DONE)
                : inquiryTicketRepository.countByBrandIdAndStoreIdAndStatusNot(user.getBrandId(), user.getStoreId(), InquiryStatus.DONE);
        long pendingAsCount = user.getRole().canViewAllStores()
                ? asTicketRepository.countByBrandIdAndStatusNot(user.getBrandId(), AsTicketStatus.DONE)
                : asTicketRepository.countByBrandIdAndStoreIdAndStatusNot(user.getBrandId(), user.getStoreId(), AsTicketStatus.DONE);

        return HubSummaryResponse.builder()
                .unreadNoticeCount(unreadNoticeCount)
                .unreadChatCount(unreadChatCount)
                .pendingScheduleCount(pendingScheduleCount)
                .pendingInquiryCount(pendingInquiryCount)
                .pendingAsCount(pendingAsCount)
                .recentNotifications(notificationService.getMyNotifications(user, 5))
                .recentDocuments(documentRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId()).stream()
                        .limit(5)
                        .map(HubSummaryResponse.RecentDocument::from)
                        .toList())
                .build();
    }

    /** 공지/문서/스케줄을 통합 검색합니다. */
    @Transactional(readOnly = true)
    public List<HubSearchResultResponse> search(User user, String query) {
        String keyword = StringUtils.hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : "";
        if (keyword.length() < 2) {
            return List.of();
        }

        List<HubSearchResultResponse> results = new ArrayList<>();
        noticeRepository.findByBrandIdOrderByPinnedDescCreatedAtDesc(user.getBrandId()).stream()
                .filter(notice -> contains(notice.getTitle(), keyword) || contains(notice.getContent(), keyword))
                .limit(10)
                .map(notice -> HubSearchResultResponse.builder()
                        .type("NOTICE")
                        .resourceId(notice.getId())
                        .title(notice.getTitle())
                        .subtitle(notice.getAuthorName())
                        .createdAt(notice.getCreatedAt() != null ? notice.getCreatedAt().toString() : null)
                        .build())
                .forEach(results::add);

        documentRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId()).stream()
                .filter(document -> contains(document.getTitle(), keyword) || contains(document.getDescription(), keyword))
                .limit(10)
                .map(document -> documentResult(document))
                .forEach(results::add);

        visibleSchedules(user).stream()
                .filter(schedule -> contains(schedule.getTitle(), keyword) || contains(schedule.getDescription(), keyword))
                .limit(10)
                .map(schedule -> HubSearchResultResponse.builder()
                        .type("SCHEDULE")
                        .resourceId(schedule.getId())
                        .title(schedule.getTitle())
                        .subtitle(schedule.getStatus().name())
                        .createdAt(schedule.getCreatedAt() != null ? schedule.getCreatedAt().toString() : null)
                        .build())
                .forEach(results::add);

        return results.stream().limit(30).toList();
    }

    private List<Schedule> visibleSchedules(User user) {
        return user.getRole().canViewAllStores()
                ? scheduleRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId())
                : scheduleRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(user.getBrandId(), user.getStoreId());
    }

    private HubSearchResultResponse documentResult(Document document) {
        return HubSearchResultResponse.builder()
                .type("DOCUMENT")
                .resourceId(document.getId())
                .title(document.getTitle())
                .subtitle(document.getCategory().name())
                .createdAt(document.getCreatedAt() != null ? document.getCreatedAt().toString() : null)
                .build();
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }
}

