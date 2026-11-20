package com.flowre.server.domain.sales.service;

import com.flowre.server.domain.sales.dto.HourlySalesResponse;
import com.flowre.server.domain.sales.dto.SalesSummaryResponse;
import com.flowre.server.domain.sales.dto.SalesUploadResponse;
import com.flowre.server.domain.sales.dto.StoreSalesResponse;
import com.flowre.server.domain.sales.entity.PaymentMethod;
import com.flowre.server.domain.sales.entity.SalesSource;
import com.flowre.server.domain.sales.entity.SalesTransaction;
import com.flowre.server.domain.sales.repository.SalesTransactionRepository;
import com.flowre.server.domain.store.entity.Store;
import com.flowre.server.domain.store.repository.StoreRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/** 매출 대시보드 지표 조회와 매출 CSV 업로드를 처리합니다. */
@Service
@RequiredArgsConstructor
public class SalesService {

    private final SalesTransactionRepository salesRepository;
    private final StoreRepository storeRepository;

    /** 오늘/주간/월간 매출 요약을 조회합니다. */
    @Transactional(readOnly = true)
    public SalesSummaryResponse getSummary(User user, Long storeId) {
        Long effectiveStoreId = resolveStoreId(user, storeId);
        LocalDate today = LocalDate.now();
        return SalesSummaryResponse.builder()
                .today(metric(user, effectiveStoreId, today.atStartOfDay(), today.plusDays(1).atStartOfDay(),
                        today.minusDays(1).atStartOfDay(), today.atStartOfDay()))
                .week(metric(user, effectiveStoreId, startOfWeek(today), startOfWeek(today).plusWeeks(1),
                        startOfWeek(today).minusWeeks(1), startOfWeek(today)))
                .month(metric(user, effectiveStoreId, today.withDayOfMonth(1).atStartOfDay(),
                        today.withDayOfMonth(1).plusMonths(1).atStartOfDay(),
                        today.withDayOfMonth(1).minusMonths(1).atStartOfDay(),
                        today.withDayOfMonth(1).atStartOfDay()))
                .build();
    }

    /** 오늘의 시간대별 매출을 조회합니다. */
    @Transactional(readOnly = true)
    public List<HourlySalesResponse> getHourly(User user, Long storeId, LocalDate date) {
        Long effectiveStoreId = resolveStoreId(user, storeId);
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<SalesTransaction> transactions = findVisibleTransactions(
                user, effectiveStoreId, targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay());
        Map<Integer, List<SalesTransaction>> byHour = transactions.stream()
                .collect(Collectors.groupingBy(tx -> tx.getTransactionDateTime().getHour()));

        List<HourlySalesResponse> result = new ArrayList<>();
        for (int hour = 0; hour < 24; hour++) {
            List<SalesTransaction> rows = byHour.getOrDefault(hour, List.of());
            result.add(HourlySalesResponse.builder()
                    .hour(hour)
                    .totalRevenue(sumAmount(rows))
                    .totalOrders(sumOrders(rows))
                    .build());
        }
        return result;
    }

    /** 본사/관리자용 매장별 매출 비교를 조회합니다. */
    @Transactional(readOnly = true)
    public List<StoreSalesResponse> getStoreComparison(User user, LocalDate date) {
        if (!user.getRole().canViewAllStores()) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime start = targetDate.atStartOfDay();
        LocalDateTime end = targetDate.plusDays(1).atStartOfDay();
        LocalDateTime previousStart = targetDate.minusDays(1).atStartOfDay();
        LocalDateTime previousEnd = targetDate.atStartOfDay();

        Map<Long, List<SalesTransaction>> current = salesRepository
                .findByBrandIdAndTransactionDateTimeBetween(user.getBrandId(), start, end)
                .stream()
                .collect(Collectors.groupingBy(SalesTransaction::getStoreId));
        Map<Long, Integer> previousRevenue = salesRepository
                .findByBrandIdAndTransactionDateTimeBetween(user.getBrandId(), previousStart, previousEnd)
                .stream()
                .collect(Collectors.groupingBy(SalesTransaction::getStoreId,
                        Collectors.summingInt(SalesTransaction::getAmount)));

        return current.entrySet().stream()
                .map(entry -> {
                    List<SalesTransaction> rows = entry.getValue();
                    int revenue = sumAmount(rows);
                    return StoreSalesResponse.builder()
                            .storeId(entry.getKey())
                            .storeName(rows.get(0).getStoreName())
                            .totalRevenue(revenue)
                            .totalOrders(sumOrders(rows))
                            .comparedToPrevious(compareRate(revenue, previousRevenue.getOrDefault(entry.getKey(), 0)))
                            .build();
                })
                .sorted(Comparator.comparing(StoreSalesResponse::getTotalRevenue).reversed())
                .toList();
    }

    /** CSV 매출 파일을 업로드합니다. 컬럼: storeId,storeName,transactionDateTime,amount,orderCount,paymentMethod */
    @Transactional
    public SalesUploadResponse upload(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.SALES_UPLOAD_FAILED, "업로드할 매출 파일이 비어 있습니다.");
        }

        int rowCount = 0;
        int skippedCount = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!StringUtils.hasText(line)) {
                    skippedCount++;
                    continue;
                }
                List<String> values = parseCsvLine(line);
                if (!values.isEmpty() && values.get(0).trim().equalsIgnoreCase("storeId")) {
                    skippedCount++;
                    continue;
                }
                if (values.size() < 4) {
                    skippedCount++;
                    continue;
                }
                Optional<SalesTransaction> parsed = parseRow(user, values);
                if (parsed.isEmpty()) {
                    skippedCount++;
                    continue;
                }
                salesRepository.save(parsed.get());
                rowCount++;
            }
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            throw new CustomException(ErrorCode.SALES_UPLOAD_FAILED, ErrorCode.SALES_UPLOAD_FAILED.getMessage(), e);
        }

        if (rowCount == 0) {
            throw new CustomException(ErrorCode.SALES_UPLOAD_FAILED, "반영할 매출 행을 찾지 못했습니다.");
        }
        return SalesUploadResponse.builder()
                .rowCount(rowCount)
                .skippedCount(skippedCount)
                .build();
    }

    private SalesSummaryResponse.SalesPeriodMetric metric(User user, Long storeId,
                                                          LocalDateTime start, LocalDateTime end,
                                                          LocalDateTime previousStart, LocalDateTime previousEnd) {
        List<SalesTransaction> current = findVisibleTransactions(user, storeId, start, end);
        List<SalesTransaction> previous = findVisibleTransactions(user, storeId, previousStart, previousEnd);
        int revenue = sumAmount(current);
        int orders = sumOrders(current);
        return SalesSummaryResponse.SalesPeriodMetric.builder()
                .totalRevenue(revenue)
                .totalOrders(orders)
                .averageOrderValue(orders == 0 ? 0 : revenue / orders)
                .comparedToPrevious(compareRate(revenue, sumAmount(previous)))
                .build();
    }

    private List<SalesTransaction> findVisibleTransactions(User user, Long storeId,
                                                           LocalDateTime start, LocalDateTime end) {
        if (storeId != null) {
            return salesRepository.findByBrandIdAndStoreIdAndTransactionDateTimeBetween(
                    user.getBrandId(), storeId, start, end);
        }
        return salesRepository.findByBrandIdAndTransactionDateTimeBetween(user.getBrandId(), start, end);
    }

    private Optional<SalesTransaction> parseRow(User user, List<String> values) {
        try {
            Long storeId = Long.valueOf(values.get(0).trim());
            if (!user.getRole().canViewAllStores() && !user.getStoreId().equals(storeId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
            }
            Store store = storeRepository.findById(storeId)
                    .filter(row -> row.getBrandId().equals(user.getBrandId()))
                    .orElse(null);
            String storeName = StringUtils.hasText(valueAt(values, 1))
                    ? valueAt(values, 1).trim()
                    : (store != null ? store.getStoreName() : user.getStoreName());
            return Optional.of(SalesTransaction.builder()
                    .brandId(user.getBrandId())
                    .storeId(storeId)
                    .storeName(storeName)
                    .transactionDateTime(LocalDateTime.parse(values.get(2).trim()))
                    .amount(Integer.parseInt(values.get(3).trim()))
                    .orderCount(values.size() > 4 && StringUtils.hasText(values.get(4)) ? Integer.parseInt(values.get(4).trim()) : 1)
                    .paymentMethod(parsePaymentMethod(valueAt(values, 5)))
                    .source(SalesSource.EXCEL)
                    .build());
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Long resolveStoreId(User user, Long requestedStoreId) {
        return user.getRole().canViewAllStores() ? requestedStoreId : user.getStoreId();
    }

    private LocalDateTime startOfWeek(LocalDate date) {
        return date.with(DayOfWeek.MONDAY).atStartOfDay();
    }

    private int sumAmount(List<SalesTransaction> transactions) {
        return transactions.stream().mapToInt(SalesTransaction::getAmount).sum();
    }

    private int sumOrders(List<SalesTransaction> transactions) {
        return transactions.stream().mapToInt(SalesTransaction::getOrderCount).sum();
    }

    private Double compareRate(int current, int previous) {
        if (previous == 0) {
            return null;
        }
        return Math.round(((current - previous) * 10000.0 / previous)) / 100.0;
    }

    private PaymentMethod parsePaymentMethod(String value) {
        if (!StringUtils.hasText(value)) {
            return PaymentMethod.OTHER;
        }
        try {
            return PaymentMethod.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return PaymentMethod.OTHER;
        }
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                quoted = !quoted;
            } else if (ch == ',' && !quoted) {
                values.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        values.add(current.toString());
        return values;
    }

    private String valueAt(List<String> values, int index) {
        return index < values.size() ? values.get(index) : "";
    }
}
