import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { storeApi, StoreActivity, OperationStatus } from '../../api/storeApi';
import { useAuthStore } from '../../store/useAuthStore';

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return '활동 없음';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export default function StoreActivityScreen() {
  const user = useAuthStore((s) => s.user);
  const isHq = user?.role === 'HQ_STAFF' || user?.role === 'ADMIN';

  const [activities, setActivities] = useState<StoreActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setActivities(await storeApi.getActivity());
    } catch {
      Alert.alert('오류', '매장 현황을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleToggleStatus = async (item: StoreActivity) => {
    const next: OperationStatus = item.operationStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const label = next === 'OPEN' ? '운영 시작' : '영업 종료';
    Alert.alert(`${item.storeName}`, `${label}으로 변경하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          setUpdatingId(item.storeId);
          try {
            await storeApi.updateOperationStatus(item.storeId, next);
            setActivities((prev) =>
              prev.map((a) => a.storeId === item.storeId ? { ...a, operationStatus: next } : a)
            );
          } catch {
            Alert.alert('오류', '상태를 변경하지 못했습니다.');
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  const openCount = activities.filter((a) => a.operationStatus === 'OPEN').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerKicker}>STORE ACTIVITY</Text>
          <Text style={styles.headerTitle}>매장 현황</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryText}>운영 중 {openCount} / {activities.length}</Text>
        </View>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => String(item.storeId)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>매장 데이터가 없습니다.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isOpen = item.operationStatus === 'OPEN';
          const doneRate = item.todayScheduleTotal > 0
            ? Math.round((item.todayScheduleDone / item.todayScheduleTotal) * 100)
            : null;
          const isUpdating = updatingId === item.storeId;

          return (
            <View style={[styles.card, isOpen && styles.cardOpen]}>
              {/* 상단 행: 매장명 + 상태 배지 */}
              <View style={styles.cardTop}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.storeCode}>{item.storeCode}</Text>
                  <Text style={styles.storeName}>{item.storeName}</Text>
                </View>
                <View style={[styles.statusBadge, isOpen ? styles.badgeOpen : styles.badgeClosed]}>
                  <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
                    {isOpen ? '운영 중' : '영업 종료'}
                  </Text>
                </View>
              </View>

              {/* 메트릭 행 */}
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>마지막 활동</Text>
                  <Text style={styles.metricValue}>{formatLastActivity(item.lastActivityAt)}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>오늘 스케줄</Text>
                  <Text style={styles.metricValue}>
                    {item.todayScheduleDone}/{item.todayScheduleTotal}건
                    {doneRate !== null ? ` (${doneRate}%)` : ''}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>직원 수</Text>
                  <Text style={styles.metricValue}>{item.activeStaffCount}명</Text>
                </View>
              </View>

              {/* 토글 버튼 */}
              <TouchableOpacity
                style={[styles.toggleBtn, isOpen ? styles.toggleClose : styles.toggleOpen, isUpdating && styles.toggleDisabled]}
                onPress={() => handleToggleStatus(item)}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                {isUpdating
                  ? <ActivityIndicator size="small" color={Colors.surface} />
                  : <Text style={styles.toggleText}>{isOpen ? '영업 종료로 변경' : '운영 시작으로 변경'}</Text>
                }
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.card,
  },
  headerKicker: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  summaryBadge: {
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  summaryText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 32, gap: Spacing.sm },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardOpen: {
    borderColor: '#22C55E' + '50',
    backgroundColor: '#F0FDF4',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  storeCode: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700' },
  storeName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeOpen: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  badgeClosed: { backgroundColor: Colors.surfaceMuted, borderColor: Colors.border },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  statusTextOpen: { color: '#16A34A' },
  statusTextClosed: { color: Colors.textMuted },

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  metricValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '700' },
  metricDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  toggleBtn: {
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  toggleOpen: { backgroundColor: Colors.primary },
  toggleClose: { backgroundColor: Colors.error },
  toggleDisabled: { opacity: 0.5 },
  toggleText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.surface },
});
