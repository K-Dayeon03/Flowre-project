import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { InventoryOrder, OrderStatus, orderApi } from '../../api/orderApi';
import { useAuthStore } from '../../store/useAuthStore';

type InitialOrderItem = {
  inventoryItemId: number;
  productCode: string;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  unitPrice?: number;
  storeName?: string;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PREPARING: '준비중',
  SHIPPING: '배송중',
  COMPLETED: '완료',
  CANCELED: '취소',
};

const STATUS_TONE: Record<OrderStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  PREPARING: 'warning',
  SHIPPING: 'primary',
  COMPLETED: 'success',
  CANCELED: 'danger',
};

const STATUS_TABS: Array<{ label: string; status?: OrderStatus }> = [
  { label: '전체' },
  { label: '준비중', status: 'PREPARING' },
  { label: '배송중', status: 'SHIPPING' },
  { label: '완료', status: 'COMPLETED' },
  { label: '취소', status: 'CANCELED' },
];

function formatWon(value?: number) {
  if (value == null) return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

function canManageOrder(role?: string) {
  return role === 'STORE_MANAGER' || role === 'HQ_STAFF' || role === 'ADMIN';
}

export default function OrderListScreen() {
  const route = useRoute<any>();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [initialItem, setInitialItem] = useState<InitialOrderItem | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const expectedAmount = useMemo(() => {
    const quantity = Number(orderQuantity);
    const price = Number(unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
    return Math.max(0, quantity) * Math.max(0, price);
  }, [orderQuantity, unitPrice]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.getOrders({ status, limit: 100 });
      setOrders(data);
    } catch (e: any) {
      Alert.alert('조회 실패', e.message ?? '발주 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const item = route.params?.initialItem as InitialOrderItem | undefined;
    if (!item) return;
    setInitialItem(item);
    const recommendedQuantity = Math.max(1, item.minQuantity - item.currentQuantity);
    setOrderQuantity(String(recommendedQuantity));
    setUnitPrice(String(item.unitPrice ?? 0));
    setModalVisible(true);
  }, [route.params?.initialItem]);

  const submitOrder = async () => {
    if (!initialItem) return;
    const quantity = Number(orderQuantity);
    const price = Number(unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert('입력 필요', '발주 수량은 1개 이상이어야 합니다.');
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      Alert.alert('입력 필요', '단가는 0원 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      await orderApi.create({
        inventoryItemId: initialItem.inventoryItemId,
        orderQuantity: quantity,
        unitPrice: price,
      });
      setModalVisible(false);
      setInitialItem(null);
      await loadOrders();
      Alert.alert('발주 완료', '발주 요청이 준비중 상태로 등록되었습니다.');
    } catch (e: any) {
      Alert.alert('발주 실패', e.message ?? '발주를 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (order: InventoryOrder, nextStatus: OrderStatus) => {
    try {
      const updated = nextStatus === 'CANCELED'
        ? await orderApi.cancel(order.id, '앱에서 취소')
        : await orderApi.changeStatus(order.id, nextStatus);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (e: any) {
      Alert.alert('처리 실패', e.message ?? '발주 상태를 변경하지 못했습니다.');
    }
  };

  const renderOrder = ({ item }: { item: InventoryOrder }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.productMeta}>{item.productCode} · {item.storeName}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.metricRow}>
        <Metric label="현재" value={`${item.currentQuantity}개`} />
        <Metric label="최소" value={`${item.minQuantity}개`} />
        <Metric label="발주" value={`${item.orderQuantity}개`} />
        <Metric label="예상" value={formatWon(item.expectedAmount)} />
      </View>

      <Text style={styles.requestMeta}>
        {item.requestedByName} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '-'}
      </Text>

      {canManageOrder(user?.role) && item.status !== 'COMPLETED' && item.status !== 'CANCELED' ? (
        <View style={styles.actionRow}>
          {item.status === 'PREPARING' ? (
            <TouchableOpacity style={styles.primaryAction} onPress={() => changeStatus(item, 'SHIPPING')}>
              <Text style={styles.primaryActionText}>배송중</Text>
            </TouchableOpacity>
          ) : null}
          {item.status === 'SHIPPING' ? (
            <TouchableOpacity style={styles.primaryAction} onPress={() => changeStatus(item, 'COMPLETED')}>
              <Text style={styles.primaryActionText}>완료</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.cancelAction} onPress={() => changeStatus(item, 'CANCELED')}>
            <Text style={styles.cancelActionText}>취소</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ORDER</Text>
          <Text style={styles.title}>원격 발주</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{orders.length.toLocaleString('ko-KR')}건</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {STATUS_TABS.map((tab) => {
          const active = status === tab.status;
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setStatus(tab.status)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>발주 내역이 없습니다</Text>
              <Text style={styles.emptyDesc}>재고 부족 항목에서 발주를 요청하면 여기에 표시됩니다.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>발주 요청</Text>
            <Text style={styles.modalProduct} numberOfLines={2}>{initialItem?.productName}</Text>
            <Text style={styles.modalMeta}>
              현재 {initialItem?.currentQuantity ?? 0}개 · 최소 {initialItem?.minQuantity ?? 5}개
            </Text>

            <Text style={styles.fieldLabel}>발주 수량</Text>
            <TextInput
              style={styles.input}
              value={orderQuantity}
              onChangeText={setOrderQuantity}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>단가</Text>
            <TextInput
              style={styles.input}
              value={unitPrice}
              onChangeText={setUnitPrice}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.estimateBox}>
              <Text style={styles.estimateLabel}>예상 금액</Text>
              <Text style={styles.estimateValue}>{formatWon(expectedAmount)}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalVisible(false)} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitOrder} disabled={submitting}>
                <Text style={styles.submitButtonText}>{submitting ? '처리중' : '발주 확정'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <View style={[styles.statusBadge, styles[`status_${tone}`]]}>
      <Text style={[styles.statusBadgeText, styles[`statusText_${tone}`]]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  kicker: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  countBadge: {
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    backgroundColor: Colors.primary + '14',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  countBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '800' },
  tabRow: { gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  tab: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  tabTextActive: { color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 96, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardTitleBlock: { flex: 1, gap: 3 },
  productName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  productMeta: { color: Colors.textMuted, fontSize: FontSize.sm },
  statusBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: FontSize.xs, fontWeight: '800' },
  status_primary: { backgroundColor: Colors.primary50, borderColor: Colors.primary + '44' },
  status_warning: { backgroundColor: Colors.warning50, borderColor: Colors.warning + '55' },
  status_success: { backgroundColor: Colors.success50, borderColor: Colors.success + '55' },
  status_danger: { backgroundColor: Colors.danger50, borderColor: Colors.danger + '55' },
  statusText_primary: { color: Colors.primary700 },
  statusText_warning: { color: Colors.warning700 },
  statusText_success: { color: Colors.success700 },
  statusText_danger: { color: Colors.danger700 },
  metricRow: { flexDirection: 'row', gap: Spacing.xs },
  metric: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  metricLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  metricValue: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900', marginTop: 2 },
  requestMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  primaryAction: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  primaryActionText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
  cancelAction: {
    borderWidth: 1,
    borderColor: Colors.danger + '55',
    backgroundColor: Colors.danger50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  cancelActionText: { color: Colors.danger700, fontSize: FontSize.sm, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: Spacing.xl },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.raised,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  modalProduct: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  modalMeta: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: -Spacing.sm },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  estimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    backgroundColor: Colors.primary50,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  estimateLabel: { color: Colors.primary700, fontSize: FontSize.sm, fontWeight: '800' },
  estimateValue: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '800' },
  submitButton: {
    flex: 2,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  submitButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '900' },
});

