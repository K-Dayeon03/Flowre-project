package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.dto.*;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.InventoryLabel;
import com.flowre.server.domain.inventory.entity.InventoryTransaction;
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

import java.util.List;

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
    public List<InventoryResponse> search(User user, Long storeId, String query, Boolean archived, String labelName) {
        Long effectiveStoreId = canViewAllStores(user) ? storeId : user.getStoreId();
        String normalizedQuery = normalizeNullable(query);
        String normalizedLabel = normalizeNullable(labelName);

        return inventoryItemRepository
                .search(user.getBrandId(), effectiveStoreId, normalizedQuery, archived, normalizedLabel)
                .stream()
                .map(InventoryResponse::from)
                .toList();
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

    /** 재고 항목에 자유 라벨을 부여하고 아카이브 목록으로 보냅니다. */
    @Transactional
    public InventoryResponse archive(User user, Long id, InventoryArchiveRequest request) {
        InventoryItem item = getItem(user, id);
        assertStoreVisible(user, item);

        String labelName = StringUtils.hasText(request.getLabelName())
                ? request.getLabelName()
                : DEFAULT_ARCHIVE_LABEL;
        InventoryLabel label = getOrCreateLabel(user.getBrandId(), labelName);
        item.archive(label, user.getName(), request.getArchiveItemName().trim(), request.getArchiveQuantity());
        return InventoryResponse.from(item);
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

    /** data 폴더의 xlsx 재고 파일을 다시 읽어 DB에 반영합니다. */
    @Transactional
    public InventoryLoadResponse reloadFromDataDirectory(User user) {
        assertCanUploadInventory(user);
        return inventoryExcelLoader.loadFromDataDirectory();
    }

    /** 관리자가 업로드한 하루 점별 재고 현황 파일을 DB에 반영합니다. */
    @Transactional
    public InventoryLoadResponse uploadDailyInventory(User user, MultipartFile file) {
        assertCanUploadInventory(user);
        return inventoryExcelLoader.loadUploadedFile(file);
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
