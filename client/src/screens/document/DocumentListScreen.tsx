import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { DocumentStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<DocumentStackParamList, 'DocumentList'>;

const CATEGORIES = ['전체', '매뉴얼', '공지', '리포트'];

const FILE_ICON: Record<string, string> = {
  pdf: '📄',
  jpg: '🖼️',
  png: '🖼️',
  xlsx: '📊',
  docx: '📝',
};

const MOCK_DOCUMENTS = [
  { id: 1, title: 'SS 2025 VM 가이드라인', category: '매뉴얼', fileType: 'pdf', size: '4.2MB', uploader: 'VMD팀', date: '2025-03-10' },
  { id: 2, title: '4월 본사 방문 일정 안내', category: '공지', fileType: 'docx', size: '0.8MB', uploader: '운영팀', date: '2025-03-09' },
  { id: 3, title: '2025년 마네킹 착장 레퍼런스', category: '매뉴얼', fileType: 'jpg', size: '12.5MB', uploader: 'VMD팀', date: '2025-03-05' },
  { id: 4, title: '2월 매장 현황 리포트', category: '리포트', fileType: 'xlsx', size: '1.2MB', uploader: '강남점 점장', date: '2025-03-01' },
  { id: 5, title: '매장 운영 가이드북 v3', category: '매뉴얼', fileType: 'pdf', size: '8.7MB', uploader: '운영팀', date: '2025-02-20' },
];

const CATEGORY_KEY: Record<string, string> = {
  전체: '',
  매뉴얼: 'MANUAL',
  공지: 'NOTICE',
  리포트: 'REPORT',
};

export default function DocumentListScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCategory, setActiveCategory] = useState('전체');

  const filtered = MOCK_DOCUMENTS.filter((d) => {
    if (activeCategory === '전체') return true;
    return d.category === activeCategory;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* 카테고리 탭 */}
      <View style={styles.tabRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.tab, activeCategory === c && styles.tabActive]}
            onPress={() => setActiveCategory(c)}
          >
            <Text style={[styles.tabText, activeCategory === c && styles.tabTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DocumentDetail', { documentId: item.id, title: item.title })}
            activeOpacity={0.7}
          >
            <Text style={styles.fileIcon}>{FILE_ICON[item.fileType] ?? '📎'}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
                <Text style={styles.metaText}>{item.size}</Text>
                <Text style={styles.metaText}>·</Text>
                <Text style={styles.metaText}>{item.date}</Text>
              </View>
              <Text style={styles.uploader}>{item.uploader}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>문서가 없습니다.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('DocumentUpload')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  fileIcon: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  categoryChip: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '600' },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  uploader: { fontSize: FontSize.xs, color: Colors.textMuted },
  arrow: { fontSize: 20, color: Colors.textMuted },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: Colors.surface, fontSize: 28, lineHeight: 32 },
});
