package com.flowre.server.domain.notice.service;

import com.flowre.server.domain.notice.dto.NoticeCreateRequest;
import com.flowre.server.domain.notice.dto.NoticeResponse;
import com.flowre.server.domain.notice.dto.UnreadCountResponse;
import com.flowre.server.domain.notice.entity.Notice;
import com.flowre.server.domain.notice.entity.NoticeRead;
import com.flowre.server.domain.notice.repository.NoticeReadRepository;
import com.flowre.server.domain.notice.repository.NoticeRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NoticeServiceTest {

    private NoticeRepository noticeRepository;
    private NoticeReadRepository noticeReadRepository;
    private NoticeService noticeService;

    @BeforeEach
    void setUp() {
        noticeRepository = mock(NoticeRepository.class);
        noticeReadRepository = mock(NoticeReadRepository.class);
        noticeService = new NoticeService(noticeRepository, noticeReadRepository);
    }

    @Test
    void getNoticesUsesUserBrandAndIncludesReadFlag() {
        User user = user(10L, 1L, UserRole.STORE_STAFF);
        Notice first = notice(1L, 1L, "필독 공지", true);
        Notice second = notice(2L, 1L, "일반 공지", false);

        when(noticeRepository.findByBrandIdOrderByPinnedDescCreatedAtDesc(1L)).thenReturn(List.of(first, second));
        when(noticeReadRepository.findByUserIdAndNoticeIdIn(10L, List.of(1L, 2L)))
                .thenReturn(List.of(NoticeRead.builder().noticeId(2L).userId(10L).build()));

        List<NoticeResponse> responses = noticeService.getNotices(user);

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).isRead()).isFalse();
        assertThat(responses.get(1).isRead()).isTrue();
        verify(noticeRepository).findByBrandIdOrderByPinnedDescCreatedAtDesc(1L);
    }

    @Test
    void createRejectsStoreStaff() {
        NoticeCreateRequest request = noticeCreateRequest("공지", "내용", false);

        assertThatThrownBy(() -> noticeService.create(user(10L, 1L, UserRole.STORE_STAFF), request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);

        verify(noticeRepository, never()).save(any(Notice.class));
    }

    @Test
    void createStoresBrandAndAuthorFromUser() {
        User manager = user(10L, 1L, UserRole.STORE_MANAGER);
        NoticeCreateRequest request = noticeCreateRequest("공지", "내용", true);
        when(noticeRepository.save(any(Notice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoticeResponse response = noticeService.create(manager, request);

        assertThat(response.getTitle()).isEqualTo("공지");
        assertThat(response.isPinned()).isTrue();
        verify(noticeRepository).save(argThat(notice ->
                notice.getBrandId().equals(1L)
                        && notice.getAuthorId().equals(10L)
                        && "테스트 사용자".equals(notice.getAuthorName())
        ));
    }

    @Test
    void markReadVerifiesBrandBeforeSavingRead() {
        User user = user(10L, 1L, UserRole.STORE_STAFF);
        when(noticeRepository.findByIdAndBrandId(1L, 1L)).thenReturn(Optional.of(notice(1L, 1L, "공지", false)));
        when(noticeReadRepository.existsByNoticeIdAndUserId(1L, 10L)).thenReturn(false);

        noticeService.markRead(user, 1L);

        verify(noticeReadRepository).save(argThat(read ->
                read.getNoticeId().equals(1L) && read.getUserId().equals(10L)
        ));
    }

    @Test
    void unreadCountSubtractsReadsInsideUserBrand() {
        User user = user(10L, 1L, UserRole.STORE_STAFF);
        when(noticeRepository.findByBrandIdOrderByPinnedDescCreatedAtDesc(1L))
                .thenReturn(List.of(notice(1L, 1L, "공지1", false), notice(2L, 1L, "공지2", false)));
        when(noticeReadRepository.countByUserIdAndNoticeIdIn(10L, List.of(1L, 2L))).thenReturn(1L);

        UnreadCountResponse response = noticeService.getUnreadCount(user);

        assertThat(response.getCount()).isEqualTo(1);
    }

    private NoticeCreateRequest noticeCreateRequest(String title, String content, boolean pinned) {
        NoticeCreateRequest request = new NoticeCreateRequest();
        ReflectionTestUtils.setField(request, "title", title);
        ReflectionTestUtils.setField(request, "content", content);
        ReflectionTestUtils.setField(request, "pinned", pinned);
        return request;
    }

    private Notice notice(Long id, Long brandId, String title, boolean pinned) {
        return Notice.builder()
                .id(id)
                .brandId(brandId)
                .title(title)
                .content("내용")
                .pinned(pinned)
                .authorId(99L)
                .authorName("작성자")
                .build();
    }

    private User user(Long id, Long brandId, UserRole role) {
        return User.builder()
                .id(id)
                .email("user@flowre.com")
                .employeeCode("1001ABCD!")
                .password("encoded")
                .name("테스트 사용자")
                .role(role)
                .brandId(brandId)
                .storeId(1001L)
                .storeCode("1001")
                .storeName("강남점")
                .build();
    }
}
