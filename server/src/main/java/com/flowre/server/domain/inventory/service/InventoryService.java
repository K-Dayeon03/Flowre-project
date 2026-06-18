package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.dto.*;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryLabel;
import com.flowre.server.domain.inventory.entity.InventoryTransaction;
import com.flowre.server.domain.inventory.entity.ProductCategory;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.inventory.repository.InventoryLabelRepository;
import com.flowre.server.domain.inventory.repository.InventoryTransactionRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.domain.user.entity.UserRole;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private static final String DEFAULT_ARCHIVE_LABEL = "추후 필요 재고";

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryLabelRepository inventoryLabelRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryExcelLoader inventoryExcelLoader;

    /** 재고 목록을 브랜드 단위로 격리해 검색합니다. */
    @Transactional(readOnly = true)
    public List<InventoryResponse> search(User user, Long storeId, String query, Boolean archived,
                                          String labelName, String category) {
        Long effectiveStoreId = canViewAllStores(user) ? storeId : user.getStoreId();
        String normalizedQuery = normalizeNullable(query);
        String normalizedLabel = normalizeNullable(labelName);
        ProductCategory parsedCategory = parseCategory(category);

        return inventoryItemRepository
                .search(user.getBrandId(), effectiveStoreId, normalizedQuery, archived, normalizedLabel, parsedCategory)
                .stream()
                .map(InventoryResponse::from)
                .toList();
    }

    /**
     * 매장 스코프 내 카테고리별 재고 건수를 모든 카테고리에 대해 반환합니다(건수 0 포함, 선언 순서 유지).
     * 직원이 카테고리 칩에서 개수를 보고 선택할 수 있도록 한다.
     *
     * @param archived 아카이브 여부 (null이면 실시간 재고 기준)
     */
    @Transactional(readOnly = true)
    public List<CategoryCountResponse> getCategoryCounts(User user, Long storeId, Boolean archived) {
        Long effectiveStoreId = canViewAllStores(user) ? storeId : user.getStoreId();
        boolean archivedFlag = Boolean.TRUE.equals(archived);

        Map<ProductCategory, Long> counts = new EnumMap<>(ProductCategory.class);
        for (InventoryItemRepository.CategoryCount row :
                inventoryItemRepository.countByCategory(user.getBrandId(), effectiveStoreId, archivedFlag)) {
            // category가 null인(분류 전) 항목은 ETC로 합산한다.
            ProductCategory category = row.getCategory() != null ? row.getCategory() : ProductCategory.ETC;
            counts.merge(category, row.getCnt(), Long::sum);
        }

        return java.util.Arrays.stream(ProductCategory.values())
                .map(category -> CategoryCountResponse.of(category, counts.getOrDefault(category, 0L)))
                .toList();
    }

    /** 문자열 카테고리 코드를 enum으로 변환합니다. 비거나 알 수 없는 값이면 null(전체)로 처리합니다. */
    private ProductCategory parseCategory(String category) {
        if (!StringUtils.hasText(category)) {
            return null;
        }
        try {
            return ProductCategory.valueOf(category.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** 재고 단건을 브랜드 단위로 격리해 조회합니다. */
    @Transactional(readOnly = true)
    public InventoryResponse getById(User user, Long id) {
        InventoryItem item = getItem(user, id);
        assertStoreVisible(user, item);
        return InventoryResponse.from(item);
    }

    /** 브랜드 내 재고 아카이브 라벨 목록을 조회합니다. */
    @Transactional(readOnly = true)
    public List<InventoryLabelResponse> getLabels(User user) {
        return inventoryLabelRepository.findByBrandIdOrderByNameAsc(user.getBrandId())
                .stream()
                .map(InventoryLabelResponse::from)
                .toList();
    }

    /** 사용자가 입력한 이름으로 아카이브 라벨을 생성하거나 기존 라벨을 반환합니다. */
    @Transactional
    public InventoryLabelResponse createLabel(User user, InventoryLabelRequest request) {
        InventoryLabel label = getOrCreateLabel(user.getBrandId(), request.getName());
        return InventoryLabelResponse.from(label);
    }

    /**
     * 입력한 수량만큼 실시간 재고에서 차감하고, 그 수량을 아카이브 항목으로 분리·이동합니다.
     *
     * 원본(실시간 재고) 항목은 수량만 줄어든 채 목록에 남고,
     * 입력한 라벨·재고명·재고 코드로 아카이브 신규 항목이 생성됩니다.
     *
     * @return 수량이 차감된 원본(실시간 재고) 항목
     */
    @Transactional
    public InventoryResponse archive(User user, Long id, InventoryArchiveRequest request) {
        InventoryItem source = getItem(user, id);
        assertStoreVisible(user, source);

        int moveQuantity = request.getArchiveQuantity();
        if (moveQuantity > source.getQuantity()) {
            throw new CustomException(ErrorCode.INVENTORY_NOT_ENOUGH);
        }

        String labelName = StringUtils.hasText(request.getLabelName())
                ? request.getLabelName()
                : DEFAULT_ARCHIVE_LABEL;
        InventoryLabel label = getOrCreateLabel(user.getBrandId(), labelName);

        // 1) 실시간 재고에서 필요한 수량만큼 차감
        source.deduct(moveQuantity);

        // 2) 차감한 수량만큼 아카이브 항목으로 이동(신규 생성)
        InventoryItem archived = InventoryItem.createArchivedFrom(
                source,
                label,
                user.getName(),
                request.getArchiveItemName().trim(),
                StringUtils.hasText(request.getArchiveItemCode()) ? request.getArchiveItemCode().trim() : null,
                moveQuantity
        );
        inventoryItemRepository.save(archived);

        return InventoryResponse.from(source);
    }

    /** 재고 항목을 아카이브에서 해제합니다. */
    @Transactional
    public InventoryResponse unarchive(User user, Long id) {
        InventoryItem item = getItem(user, id);
        assertStoreVisible(user, item);
        item.unarchive();
        return InventoryResponse.from(item);
    }

    /** 본사 사용 재고를 차감하고 이력을 남깁니다. */
    @Transactional
    public InventoryResponse deduct(User user, Long id, InventoryDeductRequest request) {
        assertCanDeduct(user);

        InventoryItem item = getItem(user, id);
        if (!request.getVersion().equals(item.getVersion())) {
            throw new CustomException(ErrorCode.INVENTORY_VERSION_CONFLICT);
        }

        item.deduct(request.getQuantity());
        inventoryTransactionRepository.save(InventoryTransaction.builder()
                .brandId(user.getBrandId())
                .storeId(item.getStoreId())
                .inventoryItemId(item.getId())
                .productCode(item.getProductCode())
                .productName(item.getProductName())
                .quantity(request.getQuantity())
                .remainingQuantity(item.getQuantity())
                .reason(request.getReason())
                .usedById(user.getId())
                .usedByName(user.getName())
                .build());

        return InventoryResponse.from(item);
    }

    /** 매장 직원이 실시간 재고 수량을 증감하고 이력을 남깁니다. */
    @Transactional
    public InventoryResponse adjust(User user, Long id, InventoryAdjustRequest request) {
        InventoryItem item = getItem(user, id);
        assertStoreVisible(user, item);
        if (!request.getVersion().equals(item.getVersion())) {
            throw new CustomException(ErrorCode.INVENTORY_VERSION_CONFLICT);
        }

        item.adjust(request.getQuantityChange());
        inventoryTransactionRepository.save(InventoryTransaction.builder()
                .brandId(user.getBrandId())
                .storeId(item.getStoreId())
                .inventoryItemId(item.getId())
                .productCode(item.getProductCode())
                .productName(item.getProductName())
                .quantity(request.getQuantityChange())
                .remainingQuantity(item.getQuantity())
                .reason(request.getReason())
                .usedById(user.getId())
                .usedByName(user.getName())
                .build());

        return InventoryResponse.from(item);
    }

    /** 본사 재고 사용 이력을 브랜드 단위로 조회합니다. */
    @Transactional(readOnly = true)
    public List<InventoryTransactionResponse> getTransactions(User user) {
        return inventoryTransactionRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId())
                .stream()
                .map(InventoryTransactionResponse::from)
                .toList();
    }

    /**
     * 특정 재고 아이템 한 건의 입출고 이력을 최신순으로 조회합니다.
     *
     * 브랜드 단위로 격리하며, 매장 직원은 자기 매장 아이템만 조회할 수 있도록 매장 스코프를 적용합니다.
     * 존재하지 않거나 다른 브랜드의 아이템이면 INVENTORY_NOT_FOUND, 타 매장 아이템이면 FORBIDDEN을 던집니다.
     *
     * @param id 입출고 이력을 조회할 재고 아이템 ID
     */
    @Transactional(readOnly = true)
    public List<InventoryTransactionResponse> getItemTransactions(User user, Long id) {
        InventoryItem item = getItem(user, id);
        assertStoreVisible(user, item);

        return inventoryTransactionRepository
                .findByBrandIdAndInventoryItemIdOrderByCreatedAtDesc(user.getBrandId(), item.getId())
                .stream()
                .map(InventoryTransactionResponse::from)
                .toList();
    }

    /** data 폴더의 xlsx 재고 파일을 다시 읽어 DB에 반영합니다. */
    @Transactional
    public InventoryLoadResponse reloadFromDataDirectory(User user) {
        assertCanUploadInventory(user);
        return inventoryExcelLoader.loadFromDataDirectory();
    }

    /**
     * 직원·점장·본사가 업로드한 당일 점별 재고 현황 파일을 DB에 반영합니다(전체 교체).
     *
     * 직원·점장(매장 소속)은 본인 매장 행만 반영되도록 매장 코드로 스코프를 제한해
     * 타 매장 재고를 덮어쓰지 못하게 한다. 본사·관리자는 파일 내 전 매장을 반영한다.
     */
    @Transactional
    public InventoryLoadResponse uploadDailyInventory(User user, MultipartFile file) {
        String storeScopeCode = canViewAllStores(user) ? null : user.getStoreCode();
        return inventoryExcelLoader.loadUploadedFile(file, storeScopeCode);
    }

    private InventoryItem getItem(User user, Long id) {
        return inventoryItemRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVENTORY_NOT_FOUND));
    }

    private InventoryLabel getOrCreateLabel(Long brandId, String rawName) {
        String name = StringUtils.hasText(rawName) ? rawName.trim() : DEFAULT_ARCHIVE_LABEL;
        return inventoryLabelRepository.findByBrandIdAndName(brandId, name)
                .orElseGet(() -> inventoryLabelRepository.save(InventoryLabel.builder()
                        .brandId(brandId)
                        .name(name)
                        .build()));
    }

    private void assertStoreVisible(User user, InventoryItem item) {
        if (!canViewAllStores(user) && !item.getStoreId().equals(user.getStoreId())) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private boolean canViewAllStores(User user) {
        return user.getRole() == UserRole.HQ_STAFF || user.getRole() == UserRole.ADMIN;
    }

    private void assertCanDeduct(User user) {
        if (user.getRole() != UserRole.HQ_STAFF && user.getRole() != UserRole.ADMIN) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void assertCanUploadInventory(User user) {
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.HQ_STAFF) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private String normalizeNullable(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
