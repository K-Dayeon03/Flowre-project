package com.flowre.server.domain.store.repository;

import com.flowre.server.domain.store.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByBrandIdOrderByStoreCodeAsc(Long brandId);
    Optional<Store> findByBrandIdAndStoreCodeAndActiveTrue(Long brandId, String storeCode);
    List<Store> findByActiveTrueAndLatitudeIsNotNullAndLongitudeIsNotNull();
    boolean existsByBrandIdAndStoreCode(Long brandId, String storeCode);
}
