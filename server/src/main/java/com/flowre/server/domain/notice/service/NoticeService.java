package com.flowre.server.domain.notice.service;

import com.flowre.server.domain.notice.dto.NoticeCreateRequest;
import com.flowre.server.domain.notice.dto.NoticeResponse;
import com.flowre.server.domain.notice.dto.UnreadCountResponse;
import com.flowre.server.domain.notice.entity.Notice;
import com.flowre.server.domain.notice.entity.NoticeRead;
import com.flowre.server.domain.notice.repository.NoticeReadRepository;
import com.flowre.server.domain.notice.repository.NoticeRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeReadRepository noticeReadRepository;

    /**
     * 인증 사용자의 브랜드 공지 목록과 각 공지의 읽음 여부를 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<NoticeResponse> getNotices(User user) {
        List<Notice> notices = noticeRepository.findByBrandIdOrderByPinnedDescCreatedAtDesc(user.getBrandId());
        List<Long> noticeIds = notices.stream().map(Notice::getId).toList();
        Set<Long> readNoticeIds = noticeIds.isEmpty()
                ? Set.of()
                : noticeReadRepository.findByUserIdAndNoticeIdIn(user.getId(), noticeIds).stream()
                .map(NoticeRead::getNoticeId)
                .collect(Collectors.toSet());

        return notices.stream()
                .map(notice -> NoticeResponse.from(notice, readNoticeIds.contains(notice.getId())))
                .toList();
    }

    /**
     * 인증 사용자의 브랜드 안에서 공지 단건을 조회합니다.
     */
    @Transactional(readOnly = true)
    public NoticeResponse getNotice(User user, Long id) {
        Notice notice = noticeRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        boolean read = noticeReadRepository.existsByNoticeIdAndUserId(id, user.getId());
        return NoticeResponse.from(notice, read);
    }

    /**
     * ADMIN, HQ_STAFF, STORE_MANAGER 권한으로 브랜드 공지를 생성합니다.
     */
    @Transactional
    public NoticeResponse create(User user, NoticeCreateRequest request) {
        assertCanCreateNotice(user);
        Notice notice = Notice.builder()
                .brandId(user.getBrandId())
                .title(request.getTitle())
                .content(request.getContent())
                .pinned(request.isPinned())
                .authorId(user.getId())
                .authorName(user.getName())
                .build();

        Notice saved = noticeRepository.save(notice);
        log.info("[Notice] created id={} brandId={} authorId={}", saved.getId(), saved.getBrandId(), saved.getAuthorId());
        return NoticeResponse.from(saved, false);
    }

    /**
     * 인증 사용자의 브랜드 공지를 읽음 처리합니다. 이미 읽음 처리된 경우 아무 작업도 하지 않습니다.
     */
    @Transactional
    public void markRead(User user, Long id) {
        Notice notice = noticeRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        if (noticeReadRepository.existsByNoticeIdAndUserId(notice.getId(), user.getId())) {
            return;
        }

        noticeReadRepository.save(NoticeRead.builder()
                .noticeId(notice.getId())
                .userId(user.getId())
                .build());
        log.info("[NoticeRead] marked noticeId={} userId={}", notice.getId(), user.getId());
    }

    /**
     * 인증 사용자의 브랜드 공지 중 아직 읽지 않은 공지 수를 조회합니다.
     */
    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(User user) {
        List<Long> noticeIds = noticeRepository.findByBrandIdOrderByPinnedDescCreatedAtDesc(user.getBrandId())
                .stream()
                .map(Notice::getId)
                .toList();
        if (noticeIds.isEmpty()) {
            return new UnreadCountResponse(0);
        }

        long readCount = noticeReadRepository.countByUserIdAndNoticeIdIn(user.getId(), noticeIds);
        return new UnreadCountResponse(noticeIds.size() - readCount);
    }

    /**
     * 공지를 수정합니다. 작성자 본인 또는 canCreateNotice 권한자가 가능합니다.
     */
    @Transactional
    public NoticeResponse update(User user, Long id, NoticeCreateRequest request) {
        Notice notice = noticeRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        assertCanModifyNotice(user, notice);
        notice.update(request.getTitle(), request.getContent(), request.isPinned());
        log.info("[Notice] updated id={} brandId={} userId={}", id, user.getBrandId(), user.getId());
        boolean read = noticeReadRepository.existsByNoticeIdAndUserId(id, user.getId());
        return NoticeResponse.from(notice, read);
    }

    /**
     * 공지를 삭제합니다. 작성자 본인 또는 canCreateNotice 권한자가 가능합니다.
     */
    @Transactional
    public void delete(User user, Long id) {
        Notice notice = noticeRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        assertCanModifyNotice(user, notice);
        noticeReadRepository.deleteByNoticeId(id);
        noticeRepository.delete(notice);
        log.info("[Notice] deleted id={} brandId={} userId={}", id, user.getBrandId(), user.getId());
    }

    private void assertCanCreateNotice(User user) {
        if (!user.getRole().canCreateNotice()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void assertCanModifyNotice(User user, Notice notice) {
        boolean isAuthor = java.util.Objects.equals(notice.getAuthorId(), user.getId());
        if (!isAuthor && !user.getRole().canCreateNotice()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
