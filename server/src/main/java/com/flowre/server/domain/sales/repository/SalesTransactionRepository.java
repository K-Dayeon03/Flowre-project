package com.flowre.server.domain.sales.repository;

import com.flowre.server.domain.sales.entity.SalesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, Long> {

    List<SalesTransaction> findByBrandIdAndTransactionDateTimeBetween(
            Long brandId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<SalesTransaction> findByBrandIdAndStoreIdAndTransactionDateTimeBetween(
            Long brandId,
            Long storeId,
            LocalDateTime start,
            LocalDateTime end
    );
}

