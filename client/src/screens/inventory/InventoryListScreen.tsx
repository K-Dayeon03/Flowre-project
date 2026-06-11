import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { InventoryItem } from '../../api/inventoryApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useInventoryStore } from '../../store/useInventoryStore';

type ModalMode = 'archive' | 'adjust' | null;

const DEFAULT_LABEL = '추후 필요 재고';

/** 금액을 원화 표기로 변환합니다. */
function formatWon(value?: number) {
  if (value == null) return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

/** 서버 data 폴더 재적재(전 매장) 권한 여부를 반환합니다. 본사·관리자 전용입니다. */
function canReloadDataDirectory(role?: string) {
  return role === 'HQ_STAFF' || role === 'ADMIN';
}

/** xlsx(엑셀) 파일 MIME 타입. */
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function InventoryListScreen() {
  const user = useAuthStore((s) => s.user);
  const items = useInventoryStore((s) => s.items);
  const labels = useInventoryStore((s) => s.labels);
  const loading = useInventoryStore((s) => s.loading);
  const fetchItems = useInventoryStore((s) => s.fetchItems);
  const fetchLabels = useInventoryStore((s) => s.fetchLabels);
  const archiveItem = useInventoryStore((s) => s.archiveItem);
  const unarchiveItem = useInventoryStore((s) => s.unarchiveItem);
  const adjustItem = useInventoryStore((s) => s.adjustItem);
  const uploadDailyFile = useInventoryStore((s) => s.uploadDailyFile);
  const reloadFromExcel = useInventoryStore((s) => s.reloadFromExcel);
  const categoryCounts = useInventoryStore((s) => s.categoryCounts);
  const fetchCategoryCounts = useInventoryStore((s) => s.fetchCategoryCounts);

  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [labelName, setLabelName] = useState(DEFAULT_LABEL);
  const [archiveItemName, setArchiveItemName] = useState('');
  const [archiveItemCode, setArchiveItemCode] = useState('');
  const [archiveQuantity, setArchiveQuantity] = useState('1');
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustSign, setAdjustSign] = useState<1 | -1>(-1);
  const [adjustReason, setAdjustReason] = useState('');

  const labelOptions = useMemo(() => labels.map((label) => label.name), [labels]);

  // 카테고리 칩: 맨 앞에 "전체"(필터 해제, 합계), 이어서 카테고리별 건수.
  const categoryChips = useMemo(() => {
    const total = categoryCounts.reduce((sum, c) => sum + c.count, 0);
    return [
      { category: undefined as string | undefined, label: '전체', count: total },
      ...categoryCounts,
    ];
  }, [categoryCounts]);

  useEffect(() => {
    fetchLabels();
  }, []);

  // 카테고리 칩 카운트는 검색어와 무관하므로 아카이브 전환 시에만 다시 집계한다.
  useEffect(() => {
    fetchCategoryCounts({ archived });
  }, [archived]);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchItems({ query, archived, labelName: selectedLabel, category: selectedCategory });
    }, 250);
    return () => clearTimeout(handle);
  }, [query, archived, selectedLabel, selectedCategory]);

  /** 라벨 입력 모달을 엽니다. */
  function openArchiveModal(item: InventoryItem) {
    setSelectedItem(item);
    setLabelName(item.archiveLabelName ?? DEFAULT_LABEL);
    setArchiveItemName(item.archiveItemName ?? item.productName);
    setArchiveItemCode(item.archiveItemCode ?? item.productCode);
    setArchiveQuantity(String(item.archiveQuantity ?? 1));
    setModalMode('archive');
  }

  /** 수량 조정 입력 모달을 엽니다. */
  function openAdjustModal(item: InventoryItem) {
    setSelectedItem(item);
    setAdjustQuantity('1');
    setAdjustSign(-1);
    setAdjustReason('실시간 재고 조정');
    setModalMode('adjust');
  }

  /** 모달 입력값으로 아카이브 또는 차감을 실행합니다. */
  async function submitModal() {
    if (!selectedItem) return;
    try {
      if (modalMode === 'archive') {
        const quantity = Number(archiveQuantity);
        if (!archiveItemName.trim()) {
          Alert.alert('확인 필요', '필요한 재고명을 입력해주세요.');
          return;
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
          Alert.alert('확인 필요', '보관 수량은 1개 이상이어야 합니다.');
          return;
        }
        if (quantity > selectedItem.quantity) {
          Alert.alert('확인 필요', '보관 수량은 현재 실시간 재고를 초과할 수 없습니다.');
          return;
        }
        await archiveItem(selectedItem.id, {
          labelName: labelName.trim() || DEFAULT_LABEL,
          archiveItemName: archiveItemName.trim(),
          archiveItemCode: archiveItemCode.trim() || undefined,
          archiveQuantity: quantity,
        });
      }
      if (modalMode === 'adjust') {
        const quantity = Number(adjustQuantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          Alert.alert('확인 필요', '조정 수량은 1개 이상이어야 합니다.');
          return;
        }
        await adjustItem(selectedItem, quantity * adjustSign, adjustReason.trim() || undefined);
      }
      setModalMode(null);
      setSelectedItem(null);
    } catch (e: any) {
      Alert.alert('처리 실패', e.message ?? '재고 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 당일 점별 재고 xlsx 파일을 선택해 서버에 업로드(전체 교체)합니다.
   * 직원·점장은 본인 매장 행만, 본사·관리자는 파일 내 전 매장이 반영됩니다.
   */
  async function handleUploadDaily() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: XLSX_MIME,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      const loaded = await uploadDailyFile({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? XLSX_MIME,
      });
      await fetchCategoryCounts({ archived });
      Alert.alert(
        '반영 완료',
        `신규 ${loaded.createdCount} · 갱신 ${loaded.updatedCount} · 수량0 처리 ${loaded.zeroedCount}건`
      );
    } catch (e: any) {
      Alert.alert('업로드 실패', e.message ?? '재고 파일을 반영하지 못했습니다.');
    }
  }

  /** 재고 카드 하나를 렌더링합니다. */
  function renderItem({ item }: { item: InventoryItem }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.productCode}>{item.productCode}</Text>
          </View>
          <View style={[styles.qtyBadge, item.quantity <= 0 && styles.qtyBadgeEmpty]}>
            <Text style={[styles.qtyText, item.quantity <= 0 && styles.qtyTextEmpty]}>
              {item.quantity}개
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          {item.categoryLabel ? <Text style={styles.meta}>분류 {item.categoryLabel}</Text> : null}
          <Text style={styles.meta}>점포 {item.storeName} ({item.storeCode})</Text>
          <Text style={styles.meta}>색상 {item.colorName ?? '-'} / 사이즈 {item.sizeName ?? '-'}</Text>
          <Text style={styles.meta}>바코드 {item.barcode ?? '-'}</Text>
          <Text style={styles.meta}>소매가 {formatWon(item.retailPrice)}</Text>
        </View>

        {item.archived && item.archiveLabelName ? (
          <View style={styles.archiveInfo}>
            <View style={styles.archiveChip}>
              <Text style={styles.archiveChipText}>{item.archiveLabelName}</Text>
            </View>
            {item.archiveItemName ? (
              <Text style={styles.archiveMeta}>
                {item.archiveItemName}
                {item.archiveItemCode ? ` (${item.archiveItemCode})` : ''} · {item.archiveQuantity ?? 0}개
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {archived ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => unarchiveItem(item.id)}>
              <Text style={styles.secondaryButtonText}>아카이브 해제</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openArchiveModal(item)}>
              <Text style={styles.secondaryButtonText}>보관</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={() => openAdjustModal(item)}>
            <Text style={styles.primaryButtonText}>수량 조정</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchBand}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="상품명, 코드, 바코드, 점포 검색"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
        />
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, !archived && styles.segmentActive]}
            onPress={() => {
              setArchived(false);
              setSelectedLabel(undefined);
            }}
          >
            <Text style={[styles.segmentText, !archived && styles.segmentTextActive]}>실시간 재고</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, archived && styles.segmentActive]}
            onPress={() => {
              setArchived(true);
              setSelectedCategory(undefined);
            }}
          >
            <Text style={[styles.segmentText, archived && styles.segmentTextActive]}>아카이브</Text>
          </TouchableOpacity>
        </View>

        {!archived ? (
          <FlatList
            horizontal
            data={categoryChips}
            keyExtractor={(item) => item.category ?? '전체'}
            contentContainerStyle={styles.labelList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = selectedCategory === item.category;
              return (
                <TouchableOpacity
                  style={[styles.labelChip, active && styles.labelChipActive]}
                  onPress={() => setSelectedCategory(item.category)}
                >
                  <Text style={[styles.labelText, active && styles.labelTextActive]}>
                    {item.label} {item.count}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : null}

        {archived ? (
          <FlatList
            horizontal
            data={['전체', ...labelOptions]}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.labelList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item === '전체' ? selectedLabel == null : selectedLabel === item;
              return (
                <TouchableOpacity
                  style={[styles.labelChip, active && styles.labelChipActive]}
                  onPress={() => setSelectedLabel(item === '전체' ? undefined : item)}
                >
                  <Text style={[styles.labelText, active && styles.labelTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : null}

        <View style={styles.uploadRow}>
          {canReloadDataDirectory(user?.role) ? (
            <TouchableOpacity
              style={styles.reloadButton}
              disabled={loading}
              onPress={async () => {
                await reloadFromExcel();
                await fetchCategoryCounts({ archived });
                Alert.alert('완료', 'data 폴더 재고 현황을 다시 반영했습니다.');
              }}
            >
              <Text style={styles.reloadButtonText}>data 재적재</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.uploadButton} disabled={loading} onPress={handleUploadDaily}>
            <Text style={styles.uploadButtonText}>하루 재고 업로드</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => fetchItems({ query, archived, labelName: selectedLabel, category: selectedCategory })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{archived ? '아카이브 재고가 없습니다.' : '조회된 재고가 없습니다.'}</Text>
            <Text style={styles.emptyText}>검색어 또는 라벨 조건을 바꿔보세요.</Text>
          </View>
        }
      />

      <Modal transparent visible={modalMode != null} animationType="fade" onRequestClose={() => setModalMode(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>
              {modalMode === 'archive' ? '재고 보관' : '실시간 수량 조정'}
            </Text>
              <Text style={styles.modalSubtitle}>{selectedItem?.productName}</Text>

            {modalMode === 'archive' ? (
              <>
                <Text style={styles.modalFieldLabel}>라벨명</Text>
                <TextInput
                  style={styles.modalInput}
                  value={labelName}
                  onChangeText={setLabelName}
                  placeholder={DEFAULT_LABEL}
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.modalFieldLabel}>필요한 재고명</Text>
                <TextInput
                  style={styles.modalInput}
                  value={archiveItemName}
                  onChangeText={setArchiveItemName}
                  placeholder="필요한 재고명"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.modalFieldLabel}>재고 코드</Text>
                <TextInput
                  style={styles.modalInput}
                  value={archiveItemCode}
                  onChangeText={setArchiveItemCode}
                  placeholder="재고 코드"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                />
                <Text style={styles.modalFieldLabel}>수량</Text>
                <TextInput
                  style={styles.modalInput}
                  value={archiveQuantity}
                  onChangeText={setArchiveQuantity}
                  keyboardType="number-pad"
                  placeholder="보관 수량"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.versionNote}>
                  현재 실시간 재고 {selectedItem?.quantity ?? 0}개 · 입력 수량만큼 차감 후 아카이브로 이동
                </Text>
              </>
            ) : (
              <>
                <View style={styles.adjustSignRow}>
                  <TouchableOpacity
                    style={[styles.adjustSignButton, adjustSign === 1 && styles.adjustSignActive]}
                    onPress={() => setAdjustSign(1)}
                  >
                    <Text style={[styles.adjustSignText, adjustSign === 1 && styles.adjustSignTextActive]}>+ 증가</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adjustSignButton, adjustSign === -1 && styles.adjustSignActive]}
                    onPress={() => setAdjustSign(-1)}
                  >
                    <Text style={[styles.adjustSignText, adjustSign === -1 && styles.adjustSignTextActive]}>- 감소</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.modalInput}
                  value={adjustQuantity}
                  onChangeText={setAdjustQuantity}
                  keyboardType="number-pad"
                  placeholder="조정 수량"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={styles.modalInput}
                  value={adjustReason}
                  onChangeText={setAdjustReason}
                  placeholder="조정 사유"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.versionNote}>현재 재고 버전 {selectedItem?.version}</Text>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalMode(null)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitModal}>
                <Text style={styles.modalSubmitText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchBand: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  segmentTextActive: { color: Colors.surface },
  labelList: { gap: Spacing.sm, paddingTop: Spacing.xs },
  labelChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  labelChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  labelText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  labelTextActive: { color: Colors.surface, fontWeight: '700' },
  uploadRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.sm },
  reloadButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reloadButtonText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  uploadButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  uploadButtonText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '700' },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 96 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  titleBlock: { flex: 1, gap: 2 },
  productName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  productCode: { fontSize: FontSize.sm, color: Colors.textSecondary },
  qtyBadge: {
    minWidth: 58,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '20',
  },
  qtyBadgeEmpty: { backgroundColor: Colors.error + '18' },
  qtyText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '800' },
  qtyTextEmpty: { color: Colors.error },
  metaGrid: { gap: 3 },
  meta: { color: Colors.textSecondary, fontSize: FontSize.sm },
  archiveChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  archiveChipText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  archiveInfo: { gap: 3, alignSelf: 'flex-start' },
  archiveMeta: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  primaryButtonText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 56, gap: Spacing.xs },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalPanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
  modalSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  modalFieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginTop: Spacing.xs },
  versionNote: { color: Colors.textMuted, fontSize: FontSize.xs },
  adjustSignRow: { flexDirection: 'row', gap: Spacing.sm },
  adjustSignButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  adjustSignActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  adjustSignText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  adjustSignTextActive: { color: Colors.surface },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancel: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  modalCancelText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  modalSubmit: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalSubmitText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '700' },
});
