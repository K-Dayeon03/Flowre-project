package com.flowre.server.domain.inventory.repository;

import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.ProductCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    /** 카테고리별 건수 집계 결과 (인터페이스 프로젝션). */
    interface CategoryCount {
        ProductCategory getCategory();
        long getCnt();
    }

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
              and (:category is null or i.category = :category)
              and (
                :query is null
                or lower(i.productName) like lower(concat('%', :query, '%'))
                or lower(i.productCode) like lower(concat('%', :query, '%'))
                or lower(i.barcode) like lower(concat('%', :query, '%'))
                or lower(i.storeName) like lower(concat('%', :query, '%'))
                or lower(i.colorName) like lower(concat('%', :query, '%'))
                or lower(i.sizeName) like lower(concat('%', :query, '%'))
              )
            """)
    Page<InventoryItem> search(
            @Param("brandId") Long brandId,
            @Param("storeId") Long storeId,
            @Param("query") String query,
            @Param("archived") Boolean archived,
            @Param("labelName") String labelName,
            @Param("category") ProductCategory category,
            Pageable pageable
    );

    /**
     * 매장 스코프 내 카테고리별 재고 건수를 집계한다. 인덱스(brand_id, store_id, archived, category)로
     * 처리되어 수만 건이어도 빠르게 카운트된다. category가 null인(분류 전) 항목은 결과에서 ETC로 합산되지 않고
     * 별도 null 그룹으로 나오므로 서비스에서 합산 처리한다.
     */
    @Query("""
            select i.category as category, count(i) as cnt
            from InventoryItem i
            where i.brandId = :brandId
              and (:storeId is null or i.storeId = :storeId)
              and i.archived = :archived
            group by i.category
            """)
    List<CategoryCount> countByCategory(
            @Param("brandId") Long brandId,
            @Param("storeId") Long storeId,
            @Param("archived") boolean archived
    );
}
