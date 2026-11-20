package com.flowre.server.domain.order.repository;

import com.flowre.server.domain.order.entity.InventoryOrder;
import com.flowre.server.domain.order.entity.OrderStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryOrderRepository extends JpaRepository<InventoryOrder, Long> {

    Optional<InventoryOrder> findByIdAndBrandId(Long id, Long brandId);

    List<InventoryOrder> findByBrandIdOrderByCreatedAtDesc(Long brandId, Pageable pageable);

    List<InventoryOrder> findByBrandIdAndStatusOrderByCreatedAtDesc(Long brandId, OrderStatus status, Pageable pageable);

    List<InventoryOrder> findByBrandIdAndStoreIdOrderByCreatedAtDesc(Long brandId, Long storeId, Pageable pageable);

    List<InventoryOrder> findByBrandIdAndStoreIdAndStatusOrderByCreatedAtDesc(
            Long brandId,
            Long storeId,
            OrderStatus status,
            Pageable pageable
    );
}

