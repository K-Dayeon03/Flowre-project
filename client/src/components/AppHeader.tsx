import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Shadow, Spacing } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useStoreContextStore } from '../store/useStoreContextStore';
import { Store, storeApi } from '../api/storeApi';
import Avatar from './Avatar';
import BrandWordmark from './BrandWordmark';
import { canApproveEmployees, canManageStores, canRegisterEmployees } from '../screens/home/homePermissions';

type HeaderTab = { label: string; route: string; group: string[] };

interface Props {
  currentRoute: string;
}

export default function AppHeader({ currentRoute }: Props) {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const selectedStore = useStoreContextStore((s) => s.selectedStore);
  const setSelectedStore = useStoreContextStore((s) => s.setSelectedStore);
  const [stores, setStores] = useState<Store[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const canSelectStore = canManageStores(user?.role);

  const displayStoreName = selectedStore?.storeName ?? user?.storeName ?? '매장';
  const defaultStoreInList = stores.some((store) => store.storeCode === user?.storeCode);
  const showDefaultStoreOption = Boolean(user?.storeCode && !defaultStoreInList);
  const employeeRoute = canApproveEmployees(user?.role) && !canRegisterEmployees(user?.role)
    ? 'EmployeeApproval'
    : 'EmployeeManage';
  const tabs: HeaderTab[] = [
    { label: '대시보드', route: 'Home', group: ['Home'] },
    { label: '스케줄', route: 'ScheduleList', group: ['ScheduleList', 'ScheduleDetail', 'ScheduleCreate'] },
    { label: '매장', route: 'StoreActivity', group: ['StoreActivity', 'StoreManage'] },
    { label: '재고', route: 'InventoryList', group: ['InventoryList'] },
    { label: '직원', route: employeeRoute, group: ['EmployeeManage', 'EmployeeApproval'] },
    { label: '문의/AS', route: 'Support', group: ['Support'] },
    { label: '공지', route: 'NoticeList', group: ['NoticeList', 'NoticeDetail', 'NoticeCreate'] },
  ];

  const openStoreSelector = async () => {
    if (!canSelectStore) return;
    try {
      const list = await storeApi.getList();
      setStores(list);
    } catch {
      setStores([]);
    }
    setModalVisible(true);
  };

  const submitSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigation.navigate('Support', { query: trimmed });
  };

  return (
    <>
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.logoButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="홈으로 이동"
        >
          <BrandWordmark size="header" light />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          style={styles.tabScroll}
        >
          {tabs.map((tab) => {
            const active = tab.group.includes(currentRoute);
            return (
              <TouchableOpacity
                key={tab.route}
                style={styles.tab}
                onPress={() => navigation.navigate(tab.route)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.rightActions}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={submitSearch}
              placeholder="검색"
              placeholderTextColor={Colors.sidebarText}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.storeChip}
            onPress={openStoreSelector}
            disabled={!canSelectStore}
            activeOpacity={0.82}
          >
            <Text style={styles.storeChipText} numberOfLines={1}>{displayStoreName}</Text>
            {canSelectStore && <Text style={styles.storeChipArrow}>⌄</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
            <Avatar name={user?.name} size={34} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>매장 선택</Text>
            {showDefaultStoreOption && (
              <TouchableOpacity
                style={[styles.storeOption, selectedStore == null && styles.storeOptionActive]}
                onPress={() => { setSelectedStore(null); setModalVisible(false); }}
              >
                <View style={styles.storeOptionCopy}>
                  <Text style={styles.storeOptionName}>{user?.storeName ?? '내 기본 매장'}</Text>
                  <Text style={styles.storeOptionCode}>{user?.storeCode ?? '-'}</Text>
                </View>
                {selectedStore == null && <Text style={styles.storeSelectedMark}>선택됨</Text>}
              </TouchableOpacity>
            )}
            {stores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.storeOption,
                  (selectedStore?.id === store.id || (selectedStore == null && store.storeCode === user?.storeCode)) && styles.storeOptionActive,
                ]}
                onPress={() => { setSelectedStore(store); setModalVisible(false); }}
              >
                <View style={styles.storeOptionCopy}>
                  <Text style={styles.storeOptionName}>{store.storeName}</Text>
                  <Text style={styles.storeOptionCode}>{store.storeCode}</Text>
                </View>
                {(selectedStore?.id === store.id || (selectedStore == null && store.storeCode === user?.storeCode)) && (
                  <Text style={styles.storeSelectedMark}>선택됨</Text>
                )}
              </TouchableOpacity>
            ))}
            {stores.length === 0 && (
              <Text style={styles.storeEmptyText}>매장 목록을 불러오지 못했습니다.</Text>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sidebar,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sidebarBorder,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.sm,
  },
  logoButton: {
    minWidth: 76,
    minHeight: 52,
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },
  tabScroll: {
    flex: 1,
  },
  tabList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 52,
    paddingHorizontal: 2,
  },
  tab: {
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    minHeight: 52,
  },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.sidebarText,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchBox: {
    width: 118,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.sidebarBorder,
    backgroundColor: Colors.sidebarMuted,
  },
  searchIcon: {
    color: Colors.sidebarText,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    color: Colors.surface,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  storeChip: {
    maxWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.sidebarMuted,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.sidebarBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  storeChipText: {
    color: Colors.sidebarText,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  storeChipArrow: {
    color: Colors.sidebarText,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(34, 52, 55, 0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.raised,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  storeOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeOptionActive: {
    borderBottomColor: Colors.border,
    backgroundColor: Colors.accentLight,
  },
  storeOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeOptionName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  storeOptionCode: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  storeSelectedMark: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  storeEmptyText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },
  modalClose: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalCloseText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '800',
  },
});
