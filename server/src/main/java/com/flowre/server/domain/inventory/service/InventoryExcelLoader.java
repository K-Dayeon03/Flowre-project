package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.dto.InventoryLoadResponse;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
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
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryExcelLoader {

    private static final long DEFAULT_BRAND_ID = 1L;
    private static final int FIRST_DATA_ROW = 5;

    private final InventoryItemRepository inventoryItemRepository;

    @Value("${flowre.inventory.data-dir:../data}")
    private String dataDir;

    /** data 폴더의 모든 xlsx 파일을 읽어 재고 테이블에 반영합니다. */
    @Transactional
    public InventoryLoadResponse loadFromDataDirectory() {
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
                LoadStats stats = loadWorkbook(file);
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

    /** 업로드된 점별 재고 xlsx 파일을 읽어 재고 테이블에 반영합니다. */
    @Transactional
    public InventoryLoadResponse loadUploadedFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return emptyResponse();
        }
        String fileName = Optional.ofNullable(file.getOriginalFilename()).orElse("inventory.xlsx");
        try {
            Path temp = Files.createTempFile("flowre-inventory-", ".xlsx");
            try {
                file.transferTo(temp);
                LoadStats stats = loadWorkbook(temp);
                return InventoryLoadResponse.builder()
                        .fileCount(1)
                        .rowCount(stats.rowCount)
                        .createdCount(stats.createdCount)
                        .updatedCount(stats.updatedCount)
                        .skippedCount(stats.skippedCount)
                        .fileNames(List.of(fileName))
                        .build();
            } finally {
                Files.deleteIfExists(temp);
            }
        } catch (Exception e) {
            log.error("[InventoryExcelLoader] failed to load uploaded file {}", fileName, e);
            return InventoryLoadResponse.builder()
                    .fileCount(1)
                    .rowCount(0)
                    .createdCount(0)
                    .updatedCount(0)
                    .skippedCount(1)
                    .fileNames(List.of(fileName))
                    .build();
        }
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

    private LoadStats loadWorkbook(Path file) throws Exception {
        try (ZipFile zip = new ZipFile(file.toFile())) {
            List<String> sharedStrings = readSharedStrings(zip);
            Document sheet = readXml(zip, "xl/worksheets/sheet1.xml");
            NodeList rows = sheet.getElementsByTagName("row");
            LoadStats stats = new LoadStats();

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

                upsert(parsed.get(), stats);
            }

            log.info("[InventoryExcelLoader] loaded {} rows from {}", stats.rowCount, file.getFileName());
            return stats;
        }
    }

    private void upsert(InventoryRow row, LoadStats stats) {
        inventoryItemRepository
                .findByBrandIdAndStoreCodeAndProductCodeAndColorCodeAndSizeNameAndBarcode(
                        DEFAULT_BRAND_ID,
                        row.storeCode(),
                        row.productCode(),
                        row.colorCode(),
                        row.sizeName(),
                        row.barcode()
                )
                .ifPresentOrElse(item -> {
                    item.updateFromLoader(
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
                }, () -> {
                    inventoryItemRepository.save(InventoryItem.builder()
                            .brandId(DEFAULT_BRAND_ID)
                            .storeId(row.storeId())
                            .storeCode(row.storeCode())
                            .storeName(row.storeName())
                            .productCode(row.productCode())
                            .colorCode(row.colorCode())
                            .colorName(row.colorName())
                            .sizeName(row.sizeName())
                            .productName(row.productName())
                            .barcode(row.barcode())
                            .sourceCode(row.sourceCode())
                            .packQuantity(row.packQuantity())
                            .normalPrice(row.normalPrice())
                            .retailPrice(row.retailPrice())
                            .quantity(row.quantity())
                            .build());
                    stats.createdCount++;
                });
        stats.rowCount++;
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
            if (!StringUtils.hasText(storeCode) || !StringUtils.hasText(productCode) || !StringUtils.hasText(productName)) {
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
            return values.get(index) == null ? "" : values.get(index).trim();
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

        private void add(LoadStats other) {
            this.rowCount += other.rowCount;
            this.createdCount += other.createdCount;
            this.updatedCount += other.updatedCount;
            this.skippedCount += other.skippedCount;
        }
    }
}
