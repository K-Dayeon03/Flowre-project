package com.flowre.server.domain.inventory.repository;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    Optional<InventoryItem> findByIdAndBrandId(Long id, Long brandId);

    Optional<InventoryItem> findByBrandIdAndStoreCodeAndProductCodeAndColorCodeAndSizeNameAndBarcode(
            Long brandId,
            String storeCode,
            String productCode,
            String colorCode,
            String sizeName,
            String barcode
    );

    /** 특정 매장의 비보관(실시간) 재고 항목 전체 — 전체 교체 스냅샷 시 기준 목록 */
    List<InventoryItem> findByBrandIdAndStoreCodeAndArchivedFalse(Long brandId, String storeCode);

    @Query("""
            select i
            from InventoryItem i
            left join i.archiveLabel l
            where i.brandId = :brandId
              and (:storeId is null or i.storeId = :storeId)
              and (:archived is null or i.archived = :archived)
              and (:labelName is null or l.name = :labelName)
              and (
                :query is null
                or lower(i.productName) like lower(concat('%', :query, '%'))
                or lower(i.productCode) like lower(concat('%', :query, '%'))
                or lower(i.barcode) like lower(concat('%', :query, '%'))
                or lower(i.storeName) like lower(concat('%', :query, '%'))
                or lower(i.colorName) like lower(concat('%', :query, '%'))
                or lower(i.sizeName) like lower(concat('%', :query, '%'))
              )
            order by i.updatedAt desc, i.id desc
            """)
    List<InventoryItem> search(
            @Param("brandId") Long brandId,
            @Param("storeId") Long storeId,
            @Param("query") String query,
            @Param("archived") Boolean archived,
            @Param("labelName") String labelName
    );
}
