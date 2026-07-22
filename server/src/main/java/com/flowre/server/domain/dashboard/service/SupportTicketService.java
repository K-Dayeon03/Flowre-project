package com.flowre.server.domain.dashboard.service;

import com.flowre.server.domain.dashboard.dto.*;
import com.flowre.server.domain.dashboard.entity.AsTicket;
import com.flowre.server.domain.dashboard.entity.AsTicketPriority;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import com.flowre.server.domain.dashboard.entity.InquiryStatus;
import com.flowre.server.domain.dashboard.entity.InquiryTicket;
import com.flowre.server.domain.dashboard.repository.AsTicketRepository;
import com.flowre.server.domain.dashboard.repository.InquiryTicketRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 문의 및 AS 접수의 CRUD를 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class SupportTicketService {

    private final InquiryTicketRepository inquiryTicketRepository;
    private final AsTicketRepository asTicketRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public List<InquiryTicketResponse> getInquiries(User user, Long storeId, int limit) {
        Long effectiveStoreId = resolveVisibleStoreId(user, storeId);
        int pageSize = clampLimit(limit);
        List<InquiryTicket> tickets = isBrandScope(user)
                ? inquiryTicketRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId(), PageRequest.of(0, pageSize))
                : inquiryTicketRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(user.getBrandId(), effectiveStoreId, PageRequest.of(0, pageSize));
        return tickets.stream().map(InquiryTicketResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public InquiryTicketResponse getInquiry(User user, Long id) {
        InquiryTicket ticket = getInquiryTicket(user, id);
        return InquiryTicketResponse.from(ticket);
    }

    @Transactional
    public InquiryTicketResponse createInquiry(User user, InquiryTicketCreateRequest request) {
        Store store = resolveStoreForCreate(user, request.getStoreId());
        InquiryTicket ticket = InquiryTicket.builder()
                .brandId(user.getBrandId())
                .storeId(store.getId())
                .storeName(store.getStoreName())
                .requesterName(request.getRequesterName().trim())
                .title(request.getTitle().trim())
                .content(StringUtils.hasText(request.getContent()) ? request.getContent().trim() : null)
                .status(InquiryStatus.PENDING)
                .build();
        return InquiryTicketResponse.from(inquiryTicketRepository.save(ticket));
    }

    @Transactional
    public InquiryTicketResponse updateInquiry(User user, Long id, InquiryTicketUpdateRequest request) {
        InquiryTicket ticket = getInquiryTicket(user, id);
        assertCanModify(user, ticket.getStoreId());
        ticket.update(request.getTitle().trim(),
                StringUtils.hasText(request.getContent()) ? request.getContent().trim() : null,
                request.getStatus());
        return InquiryTicketResponse.from(ticket);
    }

    @Transactional
    public void deleteInquiry(User user, Long id) {
        InquiryTicket ticket = getInquiryTicket(user, id);
        assertCanModify(user, ticket.getStoreId());
        inquiryTicketRepository.delete(ticket);
    }

    @Transactional
    public InquiryTicketResponse changeInquiryStatus(User user, Long id, InquiryStatus status) {
        InquiryTicket ticket = getInquiryTicket(user, id);
        assertCanModify(user, ticket.getStoreId());
        ticket.changeStatus(status);
        return InquiryTicketResponse.from(ticket);
    }

    @Transactional(readOnly = true)
    public List<AsTicketResponse> getAsTickets(User user, Long storeId, int limit) {
        Long effectiveStoreId = resolveVisibleStoreId(user, storeId);
        int pageSize = clampLimit(limit);
        List<AsTicket> tickets = isBrandScope(user)
                ? asTicketRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId(), PageRequest.of(0, pageSize))
                : asTicketRepository.findByBrandIdAndStoreIdOrderByCreatedAtDesc(user.getBrandId(), effectiveStoreId, PageRequest.of(0, pageSize));
        return tickets.stream().map(AsTicketResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AsTicketResponse getAsTicket(User user, Long id) {
        AsTicket ticket = getAsTicketEntity(user, id);
        return AsTicketResponse.from(ticket);
    }

    @Transactional
    public AsTicketResponse createAsTicket(User user, AsTicketCreateRequest request) {
        Store store = resolveStoreForCreate(user, request.getStoreId());
        AsTicket ticket = AsTicket.builder()
                .brandId(user.getBrandId())
                .storeId(store.getId())
                .storeName(store.getStoreName())
                .title(request.getTitle().trim())
                .description(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null)
                .priority(request.getPriority() != null ? request.getPriority() : AsTicketPriority.NORMAL)
                .status(AsTicketStatus.NEW)
                .build();
        return AsTicketResponse.from(asTicketRepository.save(ticket));
    }

    @Transactional
    public AsTicketResponse updateAsTicket(User user, Long id, AsTicketUpdateRequest request) {
        AsTicket ticket = getAsTicketEntity(user, id);
        assertCanModify(user, ticket.getStoreId());
        ticket.update(request.getTitle().trim(),
                StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null,
                request.getStatus(),
                request.getPriority());
        return AsTicketResponse.from(ticket);
    }

    @Transactional
    public void deleteAsTicket(User user, Long id) {
        AsTicket ticket = getAsTicketEntity(user, id);
        assertCanModify(user, ticket.getStoreId());
        asTicketRepository.delete(ticket);
    }

    @Transactional
    public AsTicketResponse changeAsTicketStatus(User user, Long id, AsTicketStatus status) {
        AsTicket ticket = getAsTicketEntity(user, id);
        assertCanModify(user, ticket.getStoreId());
        ticket.changeStatus(status);
        return AsTicketResponse.from(ticket);
    }

    private InquiryTicket getInquiryTicket(User user, Long id) {
        return inquiryTicketRepository.findById(id)
                .filter(ticket -> ticket.getBrandId().equals(user.getBrandId()))
                .orElseThrow(() -> new CustomException(ErrorCode.INQUIRY_NOT_FOUND));
    }

    private AsTicket getAsTicketEntity(User user, Long id) {
        return asTicketRepository.findById(id)
                .filter(ticket -> ticket.getBrandId().equals(user.getBrandId()))
                .orElseThrow(() -> new CustomException(ErrorCode.AS_TICKET_NOT_FOUND));
    }

    private Long resolveVisibleStoreId(User user, Long storeId) {
        if (isBrandScope(user)) {
            return storeId != null ? storeId : user.getStoreId();
        }
        return user.getStoreId();
    }

    private Store resolveStoreForCreate(User user, Long requestedStoreId) {
        Long effectiveStoreId = isBrandScope(user)
                ? (requestedStoreId != null ? requestedStoreId : user.getStoreId())
                : user.getStoreId();
        Store store = storeRepository.findById(effectiveStoreId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
        if (!store.getBrandId().equals(user.getBrandId())) {
            throw new CustomException(ErrorCode.SUPPORT_FORBIDDEN);
        }
        if (!isBrandScope(user) && !store.getId().equals(user.getStoreId())) {
            throw new CustomException(ErrorCode.SUPPORT_FORBIDDEN);
        }
        return store;
    }

    private void assertCanModify(User user, Long storeId) {
        if (isBrandScope(user)) {
            return;
        }
        if (!user.getStoreId().equals(storeId)) {
            throw new CustomException(ErrorCode.SUPPORT_FORBIDDEN);
        }
    }

    private boolean isBrandScope(User user) {
        return user.getRole() == UserRole.HQ_STAFF || user.getRole() == UserRole.ADMIN;
    }

    private int clampLimit(int limit) {
        return Math.max(1, Math.min(limit, 50));
    }
}
