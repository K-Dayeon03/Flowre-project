package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.dto.InventoryLoadResponse;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InventoryExcelLoaderTest {

    private InventoryItemRepository inventoryItemRepository;
    private InventoryExcelLoader loader;

    @BeforeEach
    void setUp() {
        inventoryItemRepository = mock(InventoryItemRepository.class);
        loader = new InventoryExcelLoader(inventoryItemRepository);
        when(inventoryItemRepository.findByBrandIdAndStoreCodeAndArchivedFalse(eq(1L), eq("0000")))
                .thenReturn(List.of());
        when(inventoryItemRepository.save(any(InventoryItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void uploadedCsvWithHeaderCreatesInventoryRows() {
        String csv = """
                매장코드,매장명,상품코드,색상코드,색상명,사이즈,상품명,바코드,소스코드,입수량,정상가,판매가,수량
                0000,Flowre 운영 본부,J1-TEST-001,48,KHAKI,L,라이트 다운필 베스트,8800000000001,--,1,49900,29900,12
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "inventory.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        InventoryLoadResponse response = loader.loadUploadedFile(file, null, 1L);

        assertThat(response.getRowCount()).isEqualTo(1);
        assertThat(response.getCreatedCount()).isEqualTo(1);
        assertThat(response.getSkippedCount()).isEqualTo(1);
        assertThat(response.getFileNames()).containsExactly("inventory.csv");
    }

    @Test
    void uploadedCsvCanBeScopedToRequesterStore() {
        String csv = """
                매장코드,매장명,상품코드,색상코드,색상명,사이즈,상품명,바코드,소스코드,입수량,정상가,판매가,수량
                0000,Flowre 운영 본부,J1-TEST-001,48,KHAKI,L,라이트 다운필 베스트,8800000000001,--,1,49900,29900,12
                1001,강남점,J1-TEST-002,11,BLACK,M,셔츠,8800000000002,--,1,39900,19900,4
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "inventory.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        InventoryLoadResponse response = loader.loadUploadedFile(file, "0000", 1L);

        assertThat(response.getRowCount()).isEqualTo(1);
        assertThat(response.getCreatedCount()).isEqualTo(1);
        assertThat(response.getSkippedCount()).isEqualTo(2);
    }
}
