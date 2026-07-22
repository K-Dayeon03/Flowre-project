package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.dto.InventoryLoadResponse;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.entity.ProductCategory;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryExcelLoader {

    private static final int FIRST_DATA_ROW = 5;

    private final InventoryItemRepository inventoryItemRepository;

    @Value("${flowre.inventory.data-dir:../data}")
    private String dataDir;

    /** data 폴더의 모든 xlsx 파일을 읽어 해당 브랜드 재고 테이블에 반영합니다. */
    @Transactional
    public InventoryLoadResponse loadFromDataDirectory(long brandId) {
        Path directory = Path.of(dataDir).toAbsolutePath().normalize();
        if (!Files.isDirectory(directory)) {
            log.warn("[InventoryExcelLoader] data directory not found: {}", directory);
            return emptyResponse();
        }

        List<Path> files = findExcelFiles(directory);
        LoadStats total = new LoadStats();
        List<String> fileNames = new ArrayList<>();

        for (Path file : files) {
            try {
                LoadStats stats = loadWorkbook(file, brandId);
                total.add(stats);
                fileNames.add(file.getFileName().toString());
            } catch (Exception e) {
                log.error("[InventoryExcelLoader] failed to load {}", file, e);
                total.skippedCount++;
            }
        }

        return InventoryLoadResponse.builder()
                .fileCount(fileNames.size())
                .rowCount(total.rowCount)
                .createdCount(total.createdCount)
                .updatedCount(total.updatedCount)
                .skippedCount(total.skippedCount)
                .fileNames(fileNames)
                .build();
    }

    /**
     * 업로드된 당일 점별 재고 xlsx/csv 파일을 읽어 재고 테이블에 반영합니다(전체 교체).
     *
     * <p>업로드 파일은 해당 매장의 "당일 완전한 현황"으로 간주한다. 따라서 파일에 등장한
     * 매장에 대해, 파일에 없는 기존 비보관(실시간) 항목의 수량은 0으로 초기화한다.
     * 보관함(archived) 항목은 건드리지 않는다.</p>
     *
     * @param file           업로드된 xlsx/csv 파일
     * @param storeScopeCode null이면 파일 내 모든 매장 반영(본사·관리자),
     *                       값이 있으면 해당 매장 행만 반영(직원·점장의 매장 격리)
     */
    @Transactional
    public InventoryLoadResponse loadUploadedFile(MultipartFile file, String storeScopeCode, long brandId) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVENTORY_UPLOAD_FAILED);
        }
        String fileName = Optional.ofNullable(file.getOriginalFilename()).orElse("inventory.xlsx");
        try {
            String extension = fileExtension(fileName);
            Path temp = Files.createTempFile("flowre-inventory-", "." + extension);
            try {
                file.transferTo(temp);
                LoadStats stats = new LoadStats();
                Map<String, Set<String>> seenByStore = new HashMap<>();
                // 매장코드 → (복합키 → 기존 비보관 항목). 매장별 1회만 조회해 행마다 SELECT 하던 것을 제거한다.
                Map<String, Map<String, InventoryItem>> existingByStore = new HashMap<>();
                if ("csv".equals(extension)) {
                    loadCsv(temp, storeScopeCode, brandId, stats, seenByStore, existingByStore);
                } else {
                    loadWorkbook(temp, storeScopeCode, brandId, stats, seenByStore, existingByStore);
                }
                // 전체 교체: 파일에 없는 기존 비보관 항목 수량을 0으로 초기화 (선조회 맵 재사용)
                stats.zeroedCount = applyFullReplacement(seenByStore, existingByStore);
                if (stats.rowCount == 0) {
                    throw new CustomException(ErrorCode.INVENTORY_UPLOAD_FAILED);
                }
                return InventoryLoadResponse.builder()
                        .fileCount(1)
                        .rowCount(stats.rowCount)
                        .createdCount(stats.createdCount)
                        .updatedCount(stats.updatedCount)
                        .skippedCount(stats.skippedCount)
                        .zeroedCount(stats.zeroedCount)
                        .fileNames(List.of(fileName))
                        .build();
            } finally {
                Files.deleteIfExists(temp);
            }
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("[InventoryExcelLoader] failed to load uploaded file {}", fileName, e);
            throw new CustomException(ErrorCode.INVENTORY_UPLOAD_FAILED, e);
        }
    }

    private String fileExtension(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".csv")) {
            return "csv";
        }
        if (lower.endsWith(".xlsx")) {
            return "xlsx";
        }
        throw new CustomException(ErrorCode.INVENTORY_UPLOAD_FAILED);
    }

    /**
     * 전체 교체 스냅샷 적용: 파일에 등장한 각 매장에 대해, 이번 파일에서 보이지 않은
     * 기존 비보관 항목의 수량을 0으로 만든다.
     *
     * @param seenByStore 매장코드 → 이번 파일에서 확인된 항목 복합키 집합
     * @return 수량을 0으로 만든 항목 수
     */
    private int applyFullReplacement(Map<String, Set<String>> seenByStore,
                                     Map<String, Map<String, InventoryItem>> existingByStore) {
        int zeroed = 0;
        for (Map.Entry<String, Set<String>> entry : seenByStore.entrySet()) {
            Set<String> seenKeys = entry.getValue();
            // 선조회한 매장별 기존 항목 맵을 재사용한다(추가 SELECT 없음).
            Map<String, InventoryItem> storeItems = existingByStore.getOrDefault(entry.getKey(), Map.of());
            for (Map.Entry<String, InventoryItem> itemEntry : storeItems.entrySet()) {
                InventoryItem item = itemEntry.getValue();
                if (item.getQuantity() != null && item.getQuantity() == 0) {
                    continue; // 이미 0이면 변경 불필요
                }
                if (!seenKeys.contains(itemEntry.getKey())) {
                    item.clearQuantityForSnapshot();
                    zeroed++;
                }
            }
        }
        return zeroed;
    }

    private String compositeKey(String productCode, String colorCode, String sizeName, String barcode) {
        return nullToEmpty(productCode) + '|' + nullToEmpty(colorCode) + '|'
                + nullToEmpty(sizeName) + '|' + nullToEmpty(barcode);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private List<Path> findExcelFiles(Path directory) {
        try (var stream = Files.list(directory)) {
            return stream
                    .filter(Files::isRegularFile)
                    .filter(path -> {
                        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
                        return name.endsWith(".xlsx") && !name.startsWith("~$");
                    })
                    .sorted()
                    .toList();
        } catch (Exception e) {
            log.error("[InventoryExcelLoader] failed to scan {}", directory, e);
            return List.of();
        }
    }

    /** data 폴더 적재용 — 매장 스코프 없이 전체를 upsert만 한다(전체 교체 미적용). */
    private LoadStats loadWorkbook(Path file, long brandId) throws Exception {
        LoadStats stats = new LoadStats();
        loadWorkbook(file, null, brandId, stats, new HashMap<>(), new HashMap<>());
        return stats;
    }

    /**
     * 워크북을 읽어 행을 upsert 한다.
     *
     * @param storeScopeCode  null이면 모든 매장 행, 값이 있으면 해당 매장 행만 반영
     * @param stats           누적 통계
     * @param seenByStore     매장코드 → 이번 파일에서 확인된 항목 복합키 집합 (전체 교체 기준)
     * @param existingByStore 매장코드 → (복합키 → 기존 비보관 항목). 매장별 1회만 조회해 캐싱한다.
     */
    private void loadWorkbook(Path file, String storeScopeCode, long brandId, LoadStats stats,
                              Map<String, Set<String>> seenByStore,
                              Map<String, Map<String, InventoryItem>> existingByStore) throws Exception {
        try (ZipFile zip = new ZipFile(file.toFile())) {
            List<String> sharedStrings = readSharedStrings(zip);
            Document sheet = readXml(zip, "xl/worksheets/sheet1.xml");
            NodeList rows = sheet.getElementsByTagName("row");

            for (int i = 0; i < rows.getLength(); i++) {
                Element row = (Element) rows.item(i);
                int rowNumber = parseInt(row.getAttribute("r"), i + 1);
                if (rowNumber < FIRST_DATA_ROW) {
                    continue;
                }

                List<String> values = readRow(row, sharedStrings);
                Optional<InventoryRow> parsed = InventoryRow.from(values);
                if (parsed.isEmpty()) {
                    stats.skippedCount++;
                    continue;
                }

                InventoryRow inventoryRow = parsed.get();
                // 매장 스코프 필터: 직원·점장 업로드 시 본인 매장 외 행은 건너뛴다
                if (storeScopeCode != null && !storeScopeCode.equals(inventoryRow.storeCode())) {
                    stats.skippedCount++;
                    continue;
                }

                upsert(inventoryRow, brandId, stats, existingByStore);
                seenByStore
                        .computeIfAbsent(inventoryRow.storeCode(), k -> new HashSet<>())
                        .add(compositeKey(inventoryRow.productCode(), inventoryRow.colorCode(),
                                inventoryRow.sizeName(), inventoryRow.barcode()));
            }

            log.info("[InventoryExcelLoader] loaded {} rows from {}", stats.rowCount, file.getFileName());
        }
    }

    /** CSV 파일을 읽어 행을 upsert 한다. 컬럼 순서는 xlsx 재고 양식과 동일해야 한다. */
    private void loadCsv(Path file, String storeScopeCode, long brandId, LoadStats stats,
                         Map<String, Set<String>> seenByStore,
                         Map<String, Map<String, InventoryItem>> existingByStore) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(Files.newInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!StringUtils.hasText(line)) {
                    continue;
                }

                List<String> values = readCsvLine(line);
                Optional<InventoryRow> parsed = InventoryRow.from(values);
                if (parsed.isEmpty()) {
                    stats.skippedCount++;
                    continue;
                }

                InventoryRow inventoryRow = parsed.get();
                if (storeScopeCode != null && !storeScopeCode.equals(inventoryRow.storeCode())) {
                    stats.skippedCount++;
                    continue;
                }

                upsert(inventoryRow, brandId, stats, existingByStore);
                seenByStore
                        .computeIfAbsent(inventoryRow.storeCode(), k -> new HashSet<>())
                        .add(compositeKey(inventoryRow.productCode(), inventoryRow.colorCode(),
                                inventoryRow.sizeName(), inventoryRow.barcode()));
            }

            log.info("[InventoryExcelLoader] loaded {} rows from {}", stats.rowCount, file.getFileName());
        }
    }

    private List<String> readCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ',' && !quoted) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        values.add(current.toString().trim());
        return values;
    }

    /**
     * 행 하나를 upsert 한다. 매장 항목을 매장별 1회 선조회해 캐싱한 {@code existingByStore} 맵에서
     * 복합키로 매칭하므로, 수만 행이어도 행마다 SELECT 하지 않는다(매장 수만큼만 조회).
     */
    private void upsert(InventoryRow row, long brandId, LoadStats stats,
                        Map<String, Map<String, InventoryItem>> existingByStore) {
        Map<String, InventoryItem> storeItems =
                existingByStore.computeIfAbsent(row.storeCode(), code -> loadExistingItems(brandId, code));
        String key = compositeKey(row.productCode(), row.colorCode(), row.sizeName(), row.barcode());
        InventoryItem existing = storeItems.get(key);

        if (existing != null) {
            existing.updateFromLoader(
                    row.storeName(),
                    row.productName(),
                    row.colorName(),
                    row.sourceCode(),
                    row.packQuantity(),
                    row.normalPrice(),
                    row.retailPrice(),
                    row.quantity()
            );
            stats.updatedCount++;
        } else {
            InventoryItem created = inventoryItemRepository.save(InventoryItem.builder()
                    .brandId(brandId)
                    .storeId(row.storeId())
                    .storeCode(row.storeCode())
                    .storeName(row.storeName())
                    .productCode(row.productCode())
                    .colorCode(row.colorCode())
                    .colorName(row.colorName())
                    .sizeName(row.sizeName())
                    .productName(row.productName())
                    .category(ProductCategory.classify(row.productName()))
                    .barcode(row.barcode())
                    .sourceCode(row.sourceCode())
                    .packQuantity(row.packQuantity())
                    .normalPrice(row.normalPrice())
                    .retailPrice(row.retailPrice())
                    .quantity(row.quantity())
                    .build());
            // 같은 파일 내 중복 행이 같은 항목을 다시 갱신하도록 캐시에 등록한다.
            storeItems.put(key, created);
            stats.createdCount++;
        }
        stats.rowCount++;
    }

    /** 매장의 비보관(실시간) 재고를 복합키 → 항목 맵으로 1회 조회한다. */
    private Map<String, InventoryItem> loadExistingItems(long brandId, String storeCode) {
        Map<String, InventoryItem> map = new HashMap<>();
        for (InventoryItem item : inventoryItemRepository
                .findByBrandIdAndStoreCodeAndArchivedFalse(brandId, storeCode)) {
            map.put(compositeKey(item.getProductCode(), item.getColorCode(),
                    item.getSizeName(), item.getBarcode()), item);
        }
        return map;
    }

    private List<String> readSharedStrings(ZipFile zip) throws Exception {
        ZipEntry entry = zip.getEntry("xl/sharedStrings.xml");
        if (entry == null) {
            return List.of();
        }

        Document doc;
        try (InputStream input = zip.getInputStream(entry)) {
            doc = newDocumentBuilderFactory().newDocumentBuilder().parse(input);
        }

        NodeList items = doc.getElementsByTagName("si");
        List<String> strings = new ArrayList<>(items.getLength());
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            NodeList textNodes = item.getElementsByTagName("t");
            StringBuilder value = new StringBuilder();
            for (int j = 0; j < textNodes.getLength(); j++) {
                value.append(textNodes.item(j).getTextContent());
            }
            strings.add(value.toString());
        }
        return strings;
    }

    private Document readXml(ZipFile zip, String entryName) throws Exception {
        ZipEntry entry = zip.getEntry(entryName);
        if (entry == null) {
            throw new IllegalArgumentException("엑셀 시트를 찾을 수 없습니다: " + entryName);
        }
        try (InputStream input = zip.getInputStream(entry)) {
            return newDocumentBuilderFactory().newDocumentBuilder().parse(input);
        }
    }

    private DocumentBuilderFactory newDocumentBuilderFactory() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        return factory;
    }

    private List<String> readRow(Element row, List<String> sharedStrings) {
        NodeList cells = row.getElementsByTagName("c");
        List<String> values = new ArrayList<>(Collections.nCopies(13, ""));

        for (int i = 0; i < cells.getLength(); i++) {
            Element cell = (Element) cells.item(i);
            int columnIndex = columnIndex(cell.getAttribute("r"));
            if (columnIndex < 0 || columnIndex >= values.size()) {
                continue;
            }
            values.set(columnIndex, readCellValue(cell, sharedStrings));
        }
        return values;
    }

    private String readCellValue(Element cell, List<String> sharedStrings) {
        String type = cell.getAttribute("t");
        if ("inlineStr".equals(type)) {
            NodeList text = cell.getElementsByTagName("t");
            return text.getLength() == 0 ? "" : text.item(0).getTextContent().trim();
        }

        NodeList valueNodes = cell.getElementsByTagName("v");
        if (valueNodes.getLength() == 0) {
            return "";
        }

        String raw = valueNodes.item(0).getTextContent().trim();
        if ("s".equals(type)) {
            int index = parseInt(raw, -1);
            return index >= 0 && index < sharedStrings.size() ? sharedStrings.get(index).trim() : "";
        }
        return normalizeNumberText(raw);
    }

    private int columnIndex(String cellReference) {
        int index = 0;
        boolean hasColumn = false;
        for (int i = 0; i < cellReference.length(); i++) {
            char c = cellReference.charAt(i);
            if (Character.isLetter(c)) {
                index = index * 26 + (Character.toUpperCase(c) - 'A' + 1);
                hasColumn = true;
            } else {
                break;
            }
        }
        return hasColumn ? index - 1 : -1;
    }

    private String normalizeNumberText(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        try {
            return new BigDecimal(raw).stripTrailingZeros().toPlainString();
        } catch (NumberFormatException e) {
            return raw.trim();
        }
    }

    private int parseInt(String value, int fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        try {
            return new BigDecimal(value.trim()).intValue();
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private InventoryLoadResponse emptyResponse() {
        return InventoryLoadResponse.builder()
                .fileCount(0)
                .rowCount(0)
                .createdCount(0)
                .updatedCount(0)
                .skippedCount(0)
                .fileNames(List.of())
                .build();
    }

    private record InventoryRow(
            Long storeId,
            String storeCode,
            String storeName,
            String productCode,
            String colorCode,
            String colorName,
            String sizeName,
            String productName,
            String barcode,
            String sourceCode,
            Integer packQuantity,
            Integer normalPrice,
            Integer retailPrice,
            Integer quantity
    ) {
        private static Optional<InventoryRow> from(List<String> values) {
            String storeCode = clean(values, 0);
            String productCode = clean(values, 2);
            String productName = clean(values, 6);
            if (!StringUtils.hasText(storeCode)
                    || !storeCode.matches("\\d{4}")
                    || !StringUtils.hasText(productCode)
                    || !StringUtils.hasText(productName)) {
                return Optional.empty();
            }

            return Optional.of(new InventoryRow(
                    parseStoreId(storeCode),
                    storeCode,
                    clean(values, 1),
                    productCode,
                    clean(values, 3),
                    clean(values, 4),
                    clean(values, 5),
                    productName,
                    clean(values, 7),
                    clean(values, 8),
                    parseInteger(values, 9),
                    parseInteger(values, 10),
                    parseInteger(values, 11),
                    parseInteger(values, 12)
            ));
        }

        private static Long parseStoreId(String storeCode) {
            try {
                return Long.valueOf(storeCode);
            } catch (NumberFormatException e) {
                return 0L;
            }
        }

        private static String clean(List<String> values, int index) {
            if (index >= values.size()) {
                return "";
            }
            return values.get(index) == null ? "" : values.get(index).replace("\uFEFF", "").trim();
        }

        private static Integer parseInteger(List<String> values, int index) {
            String value = clean(values, index);
            if (!StringUtils.hasText(value)) {
                return 0;
            }
            try {
                return new BigDecimal(value).intValue();
            } catch (NumberFormatException e) {
                return 0;
            }
        }
    }

    private static class LoadStats {
        private int rowCount;
        private int createdCount;
        private int updatedCount;
        private int skippedCount;
        private int zeroedCount;

        private void add(LoadStats other) {
            this.rowCount += other.rowCount;
            this.createdCount += other.createdCount;
            this.updatedCount += other.updatedCount;
            this.skippedCount += other.skippedCount;
            this.zeroedCount += other.zeroedCount;
        }
    }
}
