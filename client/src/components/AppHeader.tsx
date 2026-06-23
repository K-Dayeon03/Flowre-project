import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
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
import { canManageStores } from '../screens/home/homePermissions';

const TABS: { label: string; route: string; group: string[] }[] = [
  { label: '대시보드', route: 'Home', group: ['Home'] },
  { label: '스케줄', route: 'ScheduleList', group: ['ScheduleList', 'ScheduleDetail', 'ScheduleCreate'] },
  { label: '재고', route: 'InventoryList', group: ['InventoryList'] },
  { label: '문서', route: 'DocumentList', group: ['DocumentList', 'DocumentDetail', 'DocumentUpload'] },
  { label: '채팅', route: 'ChatRoomList', group: ['ChatRoomList', 'ChatRoom'] },
  { label: '공지', route: 'NoticeList', group: ['NoticeList', 'NoticeDetail', 'NoticeCreate'] },
];

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
  const canSelectStore = canManageStores(user?.role);

  const displayStoreName = selectedStore?.storeName ?? user?.storeName ?? '매장';

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
          {TABS.map((tab) => {
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
            <Text style={styles.modalTitle}>매장 컨텍스트</Text>
            <TouchableOpacity
              style={styles.storeOption}
              onPress={() => { setSelectedStore(null); setModalVisible(false); }}
            >
              <Text style={styles.storeOptionName}>내 기본 매장</Text>
              <Text style={styles.storeOptionCode}>{user?.storeName ?? '-'}</Text>
            </TouchableOpacity>
            {stores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.storeOption}
                onPress={() => { setSelectedStore(store); setModalVisible(false); }}
              >
                <Text style={styles.storeOptionName}>{store.storeName}</Text>
                <Text style={styles.storeOptionCode}>{store.storeCode}</Text>
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
    backgroundColor: 'rgba(15, 32, 96, 0.45)',
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
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeOptionName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  storeOptionCode: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
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
