package com.flowre.server.domain.inventory.service;

import com.flowre.server.domain.inventory.dto.InventoryLoadResponse;
import com.flowre.server.domain.inventory.entity.InventoryItem;
import com.flowre.server.domain.inventory.repository.InventoryItemRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class InventoryExcelLoaderTest {

    private InventoryItemRepository inventoryItemRepository;
    private StoreRepository storeRepository;
    private InventoryStockAlertNotifier stockAlertNotifier;
    private InventoryExcelLoader loader;

    @BeforeEach
    void setUp() {
        inventoryItemRepository = mock(InventoryItemRepository.class);
        storeRepository = mock(StoreRepository.class);
        stockAlertNotifier = mock(InventoryStockAlertNotifier.class);
        loader = new InventoryExcelLoader(inventoryItemRepository, storeRepository, stockAlertNotifier);
        when(inventoryItemRepository.findByBrandIdAndStoreCodeAndArchivedFalse(eq(1L), eq("0000")))
                .thenReturn(List.of());
        when(inventoryItemRepository.findByBrandIdAndStoreCodeAndArchivedFalse(eq(1L), eq("0886")))
                .thenReturn(List.of());
        when(inventoryItemRepository.findByBrandIdAndStoreCodeAndArchivedFalse(eq(1L), eq("81542")))
                .thenReturn(List.of());
        when(inventoryItemRepository.save(any(InventoryItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(storeRepository.save(any(Store.class)))
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
        verify(storeRepository).save(argThat(store ->
                store.getBrandId().equals(1L)
                        && store.getStoreCode().equals("0000")
                        && store.getStoreName().equals("Flowre 운영 본부")
                        && store.getRoadAddress() == null
        ));
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

    @Test
    void uploadedCsvPadsNumericStoreCodeWithLeadingZero() {
        String csv = """
                매장코드,매장명,상품코드,색상코드,색상명,사이즈,상품명,바코드,소스코드,입수량,정상가,판매가,수량
                886,자주 파미에스테이션점,J1-TEST-003,11,BLACK,M,데님 자켓,8800000000003,--,1,89900,59900,7
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "inventory.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        InventoryLoadResponse response = loader.loadUploadedFile(file, "0886", 1L);

        assertThat(response.getRowCount()).isEqualTo(1);
        assertThat(response.getCreatedCount()).isEqualTo(1);
        verify(storeRepository).save(argThat(store -> store.getStoreCode().equals("0886")));
    }

    @Test
    void uploadedCsvAllowsFiveDigitExternalStoreCode() {
        String csv = """
                매장코드,매장명,상품코드,색상코드,색상명,사이즈,상품명,바코드,소스코드,입수량,정상가,판매가,수량
                81542,FLOWRE,J1-TEST-004,11,BLACK,M,남녀공용 라이트 다운필 베스트,8800000000004,--,1,49900,29900,3
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
        verify(storeRepository).save(argThat(store ->
                store.getStoreCode().equals("81542") && store.getStoreName().equals("FLOWRE")
        ));
    }

    @Test
    void scopedUploadWithDifferentStoreCodeReturnsMismatchMessage() {
        String csv = """
                매장코드,매장명,상품코드,색상코드,색상명,사이즈,상품명,바코드,소스코드,입수량,정상가,판매가,수량
                81542,FLOWRE,J1-TEST-004,11,BLACK,M,남녀공용 라이트 다운필 베스트,8800000000004,--,1,49900,29900,3
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "inventory.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> loader.loadUploadedFile(file, "0000", 1L))
                .isInstanceOf(CustomException.class)
                .hasMessage("로그인한 매장 코드(0000)와 파일의 점별 코드(81542)가 달라 반영할 수 없습니다. 본사/관리자 계정으로 업로드하거나 파일의 점별 코드를 확인해주세요.")
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVENTORY_UPLOAD_FAILED);
    }

    @Test
    void uploadedCsvDoesNotCreateStoreMasterWhenStoreAlreadyExists() {
        when(storeRepository.existsByBrandIdAndStoreCode(1L, "0000")).thenReturn(true);
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
        verify(storeRepository, never()).save(any(Store.class));
    }

    @Test
    void emptyUploadReturnsDetailedFailureMessage() {
        MockMultipartFile file = new MockMultipartFile("file", "inventory.csv", "text/csv", new byte[0]);

        assertThatThrownBy(() -> loader.loadUploadedFile(file, null, 1L))
                .isInstanceOf(CustomException.class)
                .hasMessage("업로드할 재고 파일이 비어 있습니다.")
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVENTORY_UPLOAD_FAILED);
    }

    @Test
    void unsupportedExtensionReturnsDetailedFailureMessage() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "inventory.txt",
                "text/plain",
                "hello".getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> loader.loadUploadedFile(file, null, 1L))
                .isInstanceOf(CustomException.class)
                .hasMessage("xlsx 또는 csv 파일만 업로드할 수 있습니다.")
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVENTORY_UPLOAD_FAILED);
    }

    @Test
    void uploadWithoutValidRowsReturnsDetailedFailureMessage() {
        String csv = """
                매장코드,매장명,상품코드,색상코드,색상명,사이즈,상품명,바코드,소스코드,입수량,정상가,판매가,수량
                XXXX,잘못된 매장,,48,KHAKI,L,,8800000000001,--,1,49900,29900,12
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "inventory.csv",
                "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> loader.loadUploadedFile(file, null, 1L))
                .isInstanceOf(CustomException.class)
                .hasMessage("반영할 재고 행을 찾지 못했습니다. 파일의 컬럼 순서와 점별 코드를 확인해주세요.")
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVENTORY_UPLOAD_FAILED);
    }
}
