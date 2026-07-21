package com.flowre.server.domain.dashboard.repository;

import com.flowre.server.domain.dashboard.entity.InquiryTicket;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryTicketRepository extends JpaRepository<InquiryTicket, Long> {

    List<InquiryTicket> findByBrandIdOrderByCreatedAtDesc(Long brandId, Pageable pageable);

    List<InquiryTicket> findByBrandIdAndStoreIdOrderByCreatedAtDesc(Long brandId, Long storeId, Pageable pageable);
}
