import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
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
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { InventoryItem } from '../../api/inventoryApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useInventoryStore } from '../../store/useInventoryStore';

// ── 상수 ────────────────────────────────────────────────────────────
const DEFAULT_LABEL = '추후 필요 재고';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type TabKey = 'live' | 'storage' | 'history';
type ModalMode = 'archive' | 'adjust' | null;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'live', label: '실시간 재고' },
  { key: 'storage', label: '보관함' },
  { key: 'history', label: '입출고 이력' },
];

/** 금액을 원화 표기로 변환합니다. */
function formatWon(value?: number) {
  if (value == null) return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

/** 본사·관리자 여부를 반환합니다. */
function isHQ(role?: string) {
  return role === 'HQ_STAFF' || role === 'ADMIN';
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function InventoryListScreen() {
  const user = useAuthStore((s) => s.user);
  const items = useInventoryStore((s) => s.items);
  const labels = useInventoryStore((s) => s.labels);
  const loading = useInventoryStore((s) => s.loading);
  const loadingMore = useInventoryStore((s) => s.loadingMore);
  const totalCount = useInventoryStore((s) => s.totalCount);
  const hasNext = useInventoryStore((s) => s.hasNext);
  const fetchItems = useInventoryStore((s) => s.fetchItems);
  const fetchMoreItems = useInventoryStore((s) => s.fetchMoreItems);
  const fetchLabels = useInventoryStore((s) => s.fetchLabels);
  const archiveItem = useInventoryStore((s) => s.archiveItem);
  const unarchiveItem = useInventoryStore((s) => s.unarchiveItem);
  const adjustItem = useInventoryStore((s) => s.adjustItem);
  const uploadDailyFile = useInventoryStore((s) => s.uploadDailyFile);
  const reloadFromExcel = useInventoryStore((s) => s.reloadFromExcel);
  const categoryCounts = useInventoryStore((s) => s.categoryCounts);
  const fetchCategoryCounts = useInventoryStore((s) => s.fetchCategoryCounts);

  const [tab, setTab] = useState<TabKey>('live');
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  // 보관 모달 상태
  const [labelName, setLabelName] = useState(DEFAULT_LABEL);
  const [archivePurpose, setArchivePurpose] = useState('');
  const [archiveQuantity, setArchiveQuantity] = useState('1');

  // 수량 조정 모달 상태
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustSign, setAdjustSign] = useState<1 | -1>(-1);
  const [adjustReason, setAdjustReason] = useState('');

  const archived = tab === 'storage';

  const labelOptions = useMemo(() => labels.map((l) => l.name), [labels]);

  const categoryChips = useMemo(() => {
    const total = categoryCounts.reduce((sum, c) => sum + c.count, 0);
    return [
      { category: undefined as string | undefined, label: '전체', count: total },
      ...categoryCounts.map((c) => ({ category: c.category, label: c.label, count: c.count })),
    ];
  }, [categoryCounts]);

  // 탭 전환 시 목록 리셋
  useEffect(() => {
    setSelectedLabel(undefined);
    setSelectedCategory(undefined);
    setQuery('');
    fetchItems({ archived, labelName: undefined, category: undefined, query: undefined });
    fetchCategoryCounts({ archived });
  }, [tab]);

  // 초기 라벨 로드
  useEffect(() => {
    fetchLabels();
  }, []);

  // 검색어·필터 변경 시 디바운스 재조회
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchItems({ query: query || undefined, archived, labelName: selectedLabel, category: selectedCategory });
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selectedLabel, selectedCategory]);

  /** 보관 모달을 열기 전에 폼 초기화. */
  function openArchiveModal(item: InventoryItem) {
    setSelectedItem(item);
    setLabelName(item.archiveLabelName ?? DEFAULT_LABEL);
    setArchivePurpose(item.archiveItemName ?? '');
    setArchiveQuantity(String(Math.max(1, item.archiveQuantity ?? 1)));
    setModalMode('archive');
  }

  /** 수량 조정 모달을 엽니다. */
  function openAdjustModal(item: InventoryItem) {
    setSelectedItem(item);
    setAdjustQty(1);
    setAdjustSign(-1);
    setAdjustReason('');
    setModalMode('adjust');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedItem(null);
    Keyboard.dismiss();
  }

  /** 모달 폼을 제출합니다. */
  async function submitModal() {
    if (!selectedItem) return;
    try {
      if (modalMode === 'archive') {
        const qty = Number(archiveQuantity);
        if (!archivePurpose.trim()) {
          Alert.alert('입력 필요', '보관 목적을 입력해주세요 (예: VM 스테이징, 이월 재고).');
          return;
        }
        if (!Number.isInteger(qty) || qty < 1) {
          Alert.alert('입력 필요', '보관 수량은 1개 이상이어야 합니다.');
          return;
        }
        if (qty > selectedItem.quantity) {
          Alert.alert('수량 초과', `현재 실시간 재고(${selectedItem.quantity}개)를 초과할 수 없습니다.`);
          return;
        }
        await archiveItem(selectedItem.id, {
          labelName: labelName.trim() || DEFAULT_LABEL,
          archiveItemName: archivePurpose.trim(),
          archiveQuantity: qty,
        });
        Alert.alert('보관 완료', `${archivePurpose} — ${qty}개를 보관함으로 이동했습니다.`);
      }
      if (modalMode === 'adjust') {
        if (adjustQty < 1) {
          Alert.alert('입력 필요', '조정 수량은 1개 이상이어야 합니다.');
          return;
        }
        await adjustItem(selectedItem, adjustQty * adjustSign, adjustReason.trim() || undefined);
      }
      closeModal();
    } catch (e: any) {
      Alert.alert('처리 실패', e.message ?? '재고 처리 중 오류가 발생했습니다.');
    }
  }

  /** 보관 해제 확인 후 실행합니다. */
  function handleUnarchive(item: InventoryItem) {
    Alert.alert(
      '보관 해제',
      `"${item.archiveItemName ?? item.productName}" ${item.quantity}개를 실시간 재고로 복원할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복원',
          onPress: async () => {
            try {
              await unarchiveItem(item.id);
            } catch (e: any) {
              Alert.alert('실패', e.message ?? '보관 해제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }

  /** xlsx 재고 파일을 선택해 업로드합니다. */
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

  // ── 카드 렌더러 ──────────────────────────────────────────────────
  const renderLiveCard = useCallback(({ item }: { item: InventoryItem }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          {item.categoryLabel ? (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.categoryLabel}</Text>
            </View>
          ) : null}
          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.productCode}>{item.productCode}</Text>
        </View>
        {/* 수량 스테퍼 */}
        <View style={styles.qtyStepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => {
              setSelectedItem(item);
              setAdjustQty(1);
              setAdjustSign(-1);
              setAdjustReason('실시간 재고 조정');
              setModalMode('adjust');
            }}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <View style={[styles.qtyBox, item.quantity <= 0 && styles.qtyBoxEmpty]}>
            <Text style={[styles.qtyNum, item.quantity <= 0 && styles.qtyNumEmpty]}>
              {item.quantity}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => {
              setSelectedItem(item);
              setAdjustQty(1);
              setAdjustSign(1);
              setAdjustReason('실시간 재고 조정');
              setModalMode('adjust');
            }}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.storeName}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>{item.colorName ?? '-'} / {item.sizeName ?? '-'}</Text>
        {item.retailPrice ? (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>{formatWon(item.retailPrice)}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.archiveBtn} onPress={() => openArchiveModal(item)}>
          <Text style={styles.archiveBtnText}>보관함으로 이동</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adjustBtn} onPress={() => openAdjustModal(item)}>
          <Text style={styles.adjustBtnText}>수량 조정</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  const renderStorageCard = useCallback(({ item }: { item: InventoryItem }) => (
    <View style={styles.storageCard}>
      <View style={styles.storageLabelRow}>
        <View style={styles.labelPill}>
          <Text style={styles.labelPillText}>{item.archiveLabelName ?? DEFAULT_LABEL}</Text>
        </View>
        <Text style={styles.storageDateText}>
          {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('ko-KR') : ''}
        </Text>
      </View>
      <Text style={styles.storagePurpose}>{item.archiveItemName ?? item.productName}</Text>
      <Text style={styles.storageProduct}>{item.productName}</Text>
      <View style={styles.storageMeta}>
        <Text style={styles.meta}>{item.storeName}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>{item.colorName ?? '-'} / {item.sizeName ?? '-'}</Text>
      </View>
      <View style={styles.storageBottom}>
        <View style={styles.storageQtyBadge}>
          <Text style={styles.storageQtyText}>{item.quantity}개 보관</Text>
        </View>
        <TouchableOpacity style={styles.unarchiveBtn} onPress={() => handleUnarchive(item)}>
          <Text style={styles.unarchiveBtnText}>실시간 재고로 복원</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 96 }} />;
    return (
      <View style={styles.loadMoreIndicator}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadMoreText}>더 불러오는 중...</Text>
      </View>
    );
  };

  // ── 보관 탭 라벨 칩 ──────────────────────────────────────────────
  const LabelChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {['전체', ...labelOptions].map((name) => {
        const active = name === '전체' ? selectedLabel == null : selectedLabel === name;
        return (
          <TouchableOpacity
            key={name}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setSelectedLabel(name === '전체' ? undefined : name)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── 카테고리 칩 ──────────────────────────────────────────────────
  const CategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {categoryChips.map((c) => {
        const active = selectedCategory === c.category;
        return (
          <TouchableOpacity
            key={c.category ?? '전체'}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setSelectedCategory(c.category)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {c.label} <Text style={styles.chipCount}>{c.count}</Text>
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── 렌더 ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 상단 헤더 영역 ── */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.kicker}>INVENTORY</Text>
          <Text style={styles.title}>재고 관리</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount.toLocaleString('ko-KR')}건</Text>
          </View>
        </View>
      </View>

      {/* ── 탭 ── */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 검색 + 필터 (이력 탭 제외) ── */}
      {tab !== 'history' && (
        <View style={styles.filterZone}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="상품명, 코드, 바코드 검색"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          {tab === 'live' ? <CategoryChips /> : <LabelChips />}
          {/* 업로드 버튼 */}
          <View style={styles.uploadRow}>
            {isHQ(user?.role) ? (
              <TouchableOpacity
                style={styles.reloadBtn}
                disabled={loading}
                onPress={async () => {
                  await reloadFromExcel();
                  await fetchCategoryCounts({ archived });
                  Alert.alert('완료', '서버 재고 데이터를 재동기화했습니다.');
                }}
              >
                <Text style={styles.reloadBtnText}>서버 재동기화</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.uploadBtn} disabled={loading} onPress={handleUploadDaily}>
              <Text style={styles.uploadBtnText}>재고 파일 업로드</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 목록 (실시간 / 보관함) ── */}
      {tab !== 'history' && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={tab === 'live' ? renderLiveCard : renderStorageCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={fetchMoreItems}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() =>
                fetchItems({ query: query || undefined, archived, labelName: selectedLabel, category: selectedCategory })
              }
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {tab === 'live' ? '조회된 재고가 없습니다' : '보관함이 비어 있습니다'}
                </Text>
                <Text style={styles.emptyDesc}>
                  {tab === 'live'
                    ? '검색 조건을 변경하거나 재고 파일을 업로드하세요.'
                    : '실시간 재고에서 "보관함으로 이동"을 눌러 목적별 재고를 보관하세요.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ── 입출고 이력 탭 ── */}
      {tab === 'history' && <HistoryTab />}

      {/* ── 보관 모달 ── */}
      <Modal
        transparent
        visible={modalMode === 'archive'}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>보관함으로 이동</Text>
            <Text style={styles.modalSubtitle}>{selectedItem?.productName}</Text>
            <Text style={styles.modalHint}>
              현재 실시간 재고 <Text style={styles.modalHintBold}>{selectedItem?.quantity ?? 0}개</Text>
            </Text>

            {/* 라벨 (목적 그룹) */}
            <Text style={styles.fieldLabel}>보관 라벨 (목적 그룹)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelScroll}>
              {[DEFAULT_LABEL, ...labelOptions.filter((l) => l !== DEFAULT_LABEL)].map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.labelPickerChip, labelName === name && styles.labelPickerChipActive]}
                  onPress={() => setLabelName(name)}
                >
                  <Text style={[styles.labelPickerText, labelName === name && styles.labelPickerTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.modalInput}
              value={labelName}
              onChangeText={setLabelName}
              placeholder="새 라벨 직접 입력"
              placeholderTextColor={Colors.textMuted}
            />

            {/* 보관 목적 */}
            <Text style={styles.fieldLabel}>보관 목적 / 용도 *</Text>
            <TextInput
              style={styles.modalInput}
              value={archivePurpose}
              onChangeText={setArchivePurpose}
              placeholder="예: VM 스테이징, VIP 행사, 이월 재고"
              placeholderTextColor={Colors.textMuted}
            />

            {/* 수량 */}
            <Text style={styles.fieldLabel}>보관 수량</Text>
            <View style={styles.qtyInputRow}>
              <TouchableOpacity
                style={styles.qtyInputBtn}
                onPress={() => setArchiveQuantity(String(Math.max(1, Number(archiveQuantity) - 1)))}
              >
                <Text style={styles.qtyInputBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInputField}
                value={archiveQuantity}
                onChangeText={setArchiveQuantity}
                keyboardType="number-pad"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.qtyInputBtn}
                onPress={() =>
                  setArchiveQuantity(
                    String(Math.min(selectedItem?.quantity ?? 999, Number(archiveQuantity) + 1))
                  )
                }
              >
                <Text style={styles.qtyInputBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitModal}>
                <Text style={styles.submitBtnText}>보관하기</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 수량 조정 모달 ── */}
      <Modal
        transparent
        visible={modalMode === 'adjust'}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>수량 조정</Text>
            <Text style={styles.modalSubtitle}>{selectedItem?.productName}</Text>

            <View style={styles.signRow}>
              <TouchableOpacity
                style={[styles.signBtn, adjustSign === 1 && styles.signBtnPlus]}
                onPress={() => setAdjustSign(1)}
              >
                <Text style={[styles.signBtnText, adjustSign === 1 && styles.signBtnTextActive]}>＋ 입고</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.signBtn, adjustSign === -1 && styles.signBtnMinus]}
                onPress={() => setAdjustSign(-1)}
              >
                <Text style={[styles.signBtnText, adjustSign === -1 && styles.signBtnTextActive]}>－ 출고</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qtyInputRow}>
              <TouchableOpacity
                style={styles.qtyInputBtn}
                onPress={() => setAdjustQty((q) => Math.max(1, q - 1))}
              >
                <Text style={styles.qtyInputBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.qtyDisplayBox}>
                <Text style={styles.qtyDisplayNum}>{adjustQty}</Text>
                <Text style={styles.qtyDisplayLabel}>개</Text>
              </View>
              <TouchableOpacity
                style={styles.qtyInputBtn}
                onPress={() => setAdjustQty((q) => q + 1)}
              >
                <Text style={styles.qtyInputBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.adjustPreview}>
              현재 {selectedItem?.quantity ?? 0}개 → 조정 후{' '}
              <Text style={styles.adjustPreviewBold}>
                {Math.max(0, (selectedItem?.quantity ?? 0) + adjustQty * adjustSign)}개
              </Text>
            </Text>

            <Text style={styles.fieldLabel}>조정 사유 (선택)</Text>
            <TextInput
              style={styles.modalInput}
              value={adjustReason}
              onChangeText={setAdjustReason}
              placeholder="예: 반품 입고, 판매 출고, 재고 실사 보정"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitModal}>
                <Text style={styles.submitBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── 입출고 이력 서브 컴포넌트 ───────────────────────────────────────
function HistoryTab() {
  const { items: txItems, loading, error } = useInventoryTransactionList();
  if (loading) {
    return (
      <View style={styles.historyCenter}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.historyCenter}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (txItems.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>입출고 이력이 없습니다</Text>
        <Text style={styles.emptyDesc}>수량 조정 또는 출고가 발생하면 여기에 기록됩니다.</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={txItems}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      initialNumToRender={15}
      renderItem={({ item }) => (
        <View style={styles.txCard}>
          <View style={styles.txLeft}>
            <View style={[styles.txSign, item.quantity > 0 ? styles.txSignPlus : styles.txSignMinus]}>
              <Text style={styles.txSignText}>{item.quantity > 0 ? '+' : ''}{item.quantity}</Text>
            </View>
          </View>
          <View style={styles.txBody}>
            <Text style={styles.txProductName} numberOfLines={1}>{item.productName}</Text>
            <Text style={styles.txMeta}>{item.usedByName} · 잔여 {item.remainingQuantity}개</Text>
            {item.reason ? <Text style={styles.txReason}>{item.reason}</Text> : null}
          </View>
          <Text style={styles.txDate}>
            {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}
    />
  );
}

/** 입출고 이력을 로드하는 간단한 로컬 훅 */
function useInventoryTransactionList() {
  const [txItems, setTxItems] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    import('../../api/inventoryApi').then(({ inventoryApi }) => {
      inventoryApi.getTransactions()
        .then((data: any) => { setTxItems(data); setTxLoading(false); })
        .catch((e: any) => { setTxError(e.message ?? '이력 조회 실패'); setTxLoading(false); });
    });
  }, []);

  return { items: txItems, loading: txLoading, error: txError };
}

// ── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { gap: 2 },
  kicker: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  headerRight: { alignItems: 'flex-end' },
  countBadge: {
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  countBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },

  // 탭
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabItemActive: {
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  // 필터 영역
  filterZone: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  searchRow: {},
  searchInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: { gap: Spacing.xs, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  chipCount: { color: Colors.textMuted, fontWeight: '600' },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  reloadBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reloadBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  uploadBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  // 목록
  listContent: { paddingHorizontal: Spacing.md, paddingTop: 4, gap: Spacing.sm },

  // 실시간 카드
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  cardTitleBlock: { flex: 1, gap: 3 },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  categoryTagText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  productName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  productCode: { fontSize: FontSize.sm, color: Colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  metaDot: { color: Colors.border, fontSize: FontSize.sm },

  // 수량 스테퍼 (인라인)
  qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  stepBtnText: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '700', lineHeight: 18 },
  qtyBox: {
    minWidth: 44,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: Colors.success + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyBoxEmpty: { backgroundColor: Colors.error + '1A' },
  qtyNum: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.success },
  qtyNumEmpty: { color: Colors.error },

  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  archiveBtn: {
    borderWidth: 1,
    borderColor: Colors.accent + '88',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: Colors.accent + '12',
  },
  archiveBtnText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  adjustBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  adjustBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  // 보관함 카드
  storageCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '55',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  storageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelPill: {
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  labelPillText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  storageDateText: { color: Colors.textMuted, fontSize: FontSize.xs },
  storagePurpose: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  storageProduct: { fontSize: FontSize.sm, color: Colors.textSecondary },
  storageMeta: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  storageBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storageQtyBadge: {
    backgroundColor: Colors.accent + '22',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  storageQtyText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  unarchiveBtn: {
    borderWidth: 1,
    borderColor: Colors.success + '66',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  unarchiveBtnText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '700' },

  // 더보기
  loadMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingBottom: 96,
  },
  loadMoreText: { color: Colors.textMuted, fontSize: FontSize.sm },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // 이력 탭
  historyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, fontSize: FontSize.sm },
  txCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  txLeft: {},
  txSign: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txSignPlus: { backgroundColor: Colors.success + '1A' },
  txSignMinus: { backgroundColor: Colors.error + '1A' },
  txSignText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textPrimary },
  txBody: { flex: 1, gap: 3 },
  txProductName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  txMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  txReason: { fontSize: FontSize.sm, color: Colors.textMuted },
  txDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // 모달
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
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: -Spacing.sm },
  modalHint: { fontSize: FontSize.sm, color: Colors.textMuted },
  modalHintBold: { fontWeight: '700', color: Colors.textPrimary },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  labelScroll: { maxHeight: 44 },
  labelPickerChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: Spacing.xs,
    backgroundColor: Colors.surfaceMuted,
  },
  labelPickerChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  labelPickerText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  labelPickerTextActive: { color: '#fff', fontWeight: '700' },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceMuted,
  },

  // 수량 입력 스테퍼 (모달)
  qtyInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyInputBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  qtyInputBtnText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, lineHeight: 24 },
  qtyInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  qtyDisplayBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  qtyDisplayNum: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  qtyDisplayLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },

  // 수량 조정 미리보기
  adjustPreview: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  adjustPreviewBold: { color: Colors.primary, fontWeight: '700' },

  // 입/출고 sign 버튼
  signRow: { flexDirection: 'row', gap: Spacing.sm },
  signBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  signBtnPlus: { backgroundColor: Colors.success + '15', borderColor: Colors.success + '55' },
  signBtnMinus: { backgroundColor: Colors.error + '15', borderColor: Colors.error + '55' },
  signBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
  signBtnTextActive: { color: Colors.textPrimary },

  // 모달 액션
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
