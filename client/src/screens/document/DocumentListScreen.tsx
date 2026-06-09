import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { DocumentStackParamList } from '../../navigation/types';
import { Document, DocumentCategory, documentApi } from '../../api/documentApi';

type Nav = NativeStackNavigationProp<DocumentStackParamList, 'DocumentList'>;

const CATEGORIES: Array<{ label: string; value?: DocumentCategory }> = [
  { label: '전체' },
  { label: '매뉴얼', value: 'MANUAL' },
  { label: '공지', value: 'NOTICE' },
  { label: '리포트', value: 'REPORT' },
];

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  MANUAL: '매뉴얼',
  NOTICE: '공지',
  REPORT: '리포트',
};

const FILE_ICON: Record<string, string> = {
  pdf: 'PDF',
  jpg: 'IMG',
  jpeg: 'IMG',
  png: 'IMG',
  xlsx: 'XLS',
  docx: 'DOC',
};

function getFileLabel(fileType?: string) {
  const key = (fileType ?? '').split('/').pop()?.toLowerCase() ?? '';
  return FILE_ICON[key] ?? 'FILE';
}

export default function DocumentListScreen() {
  const navigation = useNavigation<Nav>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | undefined>();
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      setDocuments(await documentApi.getList(activeCategory ? { category: activeCategory } : undefined));
    } catch {
      Alert.alert('오류', '문서 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [activeCategory])
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading && documents.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <>
        <View style={styles.tabRow}>
          {CATEGORIES.map((category) => {
            const active = activeCategory === category.value;
            return (
              <TouchableOpacity
                key={category.label}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveCategory(category.value)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{category.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <FlatList
          data={documents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchDocuments}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('DocumentDetail', { documentId: item.id, title: item.title })}
              activeOpacity={0.75}
            >
              <View style={styles.fileBadge}>
                <Text style={styles.fileBadgeText}>{getFileLabel(item.fileType)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{CATEGORY_LABEL[item.category]}</Text>
                  </View>
                  <Text style={styles.metaText}>{item.size}</Text>
                  <Text style={styles.metaText}>·</Text>
                  <Text style={styles.metaText}>{item.createdAt?.split('T')[0] ?? '-'}</Text>
                </View>
                <Text style={styles.uploader}>{item.uploader}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>업로드된 문서가 없습니다.</Text>
            </View>
          }
        />
        </>
      )}

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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 88 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBadgeText: { color: Colors.surface, fontSize: FontSize.xs, fontWeight: '800' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  categoryChip: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700' },
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
