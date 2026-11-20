package com.flowre.server.domain.dashboard.repository;

import com.flowre.server.domain.dashboard.entity.AsTicket;
import com.flowre.server.domain.dashboard.entity.AsTicketStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AsTicketRepository extends JpaRepository<AsTicket, Long> {

    List<AsTicket> findByBrandIdOrderByCreatedAtDesc(Long brandId, Pageable pageable);

    List<AsTicket> findByBrandIdAndStoreIdOrderByCreatedAtDesc(Long brandId, Long storeId, Pageable pageable);

    long countByBrandIdAndStatusNot(Long brandId, AsTicketStatus status);

    long countByBrandIdAndStoreIdAndStatusNot(Long brandId, Long storeId, AsTicketStatus status);
}
