package com.flowre.server.domain.inventory.repository;

import com.flowre.server.domain.inventory.entity.InventoryLabel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryLabelRepository extends JpaRepository<InventoryLabel, Long> {

    List<InventoryLabel> findByBrandIdOrderByNameAsc(Long brandId);

    Optional<InventoryLabel> findByBrandIdAndName(Long brandId, String name);
}
