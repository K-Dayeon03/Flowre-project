import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { HourlySales, SalesSummary, salesApi, StoreSales } from '../../api/salesApi';
import { useAuthStore } from '../../store/useAuthStore';

function formatWon(value?: number) {
  if (value == null) return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatRate(value?: number | null) {
  if (value == null) return '비교 데이터 없음';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function canViewStores(role?: string) {
  return role === 'HQ_STAFF' || role === 'ADMIN';
}

export default function SalesDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [hourly, setHourly] = useState<HourlySales[]>([]);
  const [stores, setStores] = useState<StoreSales[]>([]);
  const [loading, setLoading] = useState(false);

  const maxHourlyRevenue = useMemo(
    () => Math.max(1, ...hourly.map((item) => item.totalRevenue)),
    [hourly]
  );

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, hourlyResult, storeResult] = await Promise.all([
        salesApi.getSummary(),
        salesApi.getHourly(),
        canViewStores(user?.role) ? salesApi.getStores().catch(() => []) : Promise.resolve([]),
      ]);
      setSummary(summaryResult);
      setHourly(hourlyResult);
      setStores(storeResult);
    } catch (e: any) {
      Alert.alert('조회 실패', e.message ?? '매출 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const uploadSales = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/csv', 'application/csv', 'text/comma-separated-values'],
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      const loaded = await salesApi.upload({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'text/csv',
        file: asset.file,
      });
      await loadSales();
      Alert.alert('반영 완료', `매출 ${loaded.rowCount}건을 반영했습니다.`);
    } catch (e: any) {
      Alert.alert('업로드 실패', e.message ?? '매출 파일을 반영하지 못했습니다.');
    }
  };

  const renderStore = ({ item }: { item: StoreSales }) => (
    <View style={styles.storeRow}>
      <View style={styles.storeMain}>
        <Text style={styles.storeName} numberOfLines={1}>{item.storeName}</Text>
        <Text style={styles.storeMeta}>{item.totalOrders.toLocaleString('ko-KR')}건 · {formatRate(item.comparedToPrevious)}</Text>
      </View>
      <Text style={styles.storeAmount}>{formatWon(item.totalRevenue)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>SALES</Text>
          <Text style={styles.title}>매출 대시보드</Text>
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={uploadSales}>
          <Text style={styles.uploadButtonText}>CSV 업로드</Text>
        </TouchableOpacity>
      </View>

      {loading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={canViewStores(user?.role) ? stores : []}
          keyExtractor={(item) => String(item.storeId)}
          renderItem={renderStore}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSales} tintColor={Colors.primary} />}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.stack}>
              <View style={styles.metricGrid}>
                <SalesCard label="오늘" metric={summary?.today} />
                <SalesCard label="이번 주" metric={summary?.week} />
                <SalesCard label="이번 달" metric={summary?.month} />
              </View>

              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>시간대별 매출</Text>
                  <Text style={styles.panelMeta}>오늘 기준</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyRow}>
                  {hourly.map((item) => {
                    const height = Math.max(6, Math.round((item.totalRevenue / maxHourlyRevenue) * 92));
                    return (
                      <View key={item.hour} style={styles.hourBarItem}>
                        <View style={styles.hourBarTrack}>
                          <View style={[styles.hourBar, { height }]} />
                        </View>
                        <Text style={styles.hourLabel}>{item.hour}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {canViewStores(user?.role) ? (
                <View style={styles.panelHeaderOnly}>
                  <Text style={styles.panelTitle}>매장별 비교</Text>
                  <Text style={styles.panelMeta}>오늘 매출순</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            canViewStores(user?.role) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>매장별 매출 데이터가 없습니다</Text>
                <Text style={styles.emptyDesc}>CSV 업로드 후 매장별 비교가 표시됩니다.</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function SalesCard({ label, metric }: { label: string; metric?: SalesSummary['today'] }) {
  return (
    <View style={styles.salesCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{formatWon(metric?.totalRevenue ?? 0)}</Text>
      <Text style={styles.cardMeta}>
        {metric?.totalOrders ?? 0}건 · 객단가 {formatWon(metric?.averageOrderValue ?? 0)}
      </Text>
      <Text style={[
        styles.rateText,
        (metric?.comparedToPrevious ?? 0) > 0 ? styles.rateUp : (metric?.comparedToPrevious ?? 0) < 0 ? styles.rateDown : null,
      ]}>
        {formatRate(metric?.comparedToPrevious)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  kicker: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900' },
  uploadButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  uploadButtonText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 96, gap: Spacing.sm },
  stack: { gap: Spacing.md },
  metricGrid: { gap: Spacing.sm },
  salesCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    ...Shadow.card,
  },
  cardLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  cardValue: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900' },
  cardMeta: { color: Colors.textSecondary, fontSize: FontSize.sm },
  rateText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  rateUp: { color: Colors.success700 },
  rateDown: { color: Colors.danger700 },
  panel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelHeaderOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  panelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  panelMeta: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  hourlyRow: { alignItems: 'flex-end', gap: 8, paddingTop: Spacing.sm },
  hourBarItem: { alignItems: 'center', gap: 5, width: 24 },
  hourBarTrack: {
    height: 100,
    width: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  hourBar: { width: 12, borderRadius: Radius.full, backgroundColor: Colors.primary },
  hourLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  storeRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.card,
  },
  storeMain: { flex: 1, gap: 3 },
  storeName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  storeMeta: { color: Colors.textMuted, fontSize: FontSize.sm },
  storeAmount: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: Spacing.xl },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});

