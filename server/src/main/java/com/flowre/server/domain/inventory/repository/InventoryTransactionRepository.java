package com.flowre.server.domain.inventory.repository;

import com.flowre.server.domain.inventory.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    List<InventoryTransaction> findByBrandIdOrderByCreatedAtDesc(Long brandId);
}
