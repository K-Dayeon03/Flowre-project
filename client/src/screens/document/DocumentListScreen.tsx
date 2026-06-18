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
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import { Document, DocumentCategory, documentApi } from '../../api/documentApi';
import FilterBar from '../../components/FilterBar';

type Nav = NativeStackNavigationProp<MainStackParamList, 'DocumentList'>;

const CATEGORIES: Array<{ label: string; value: DocumentCategory | undefined }> = [
  { label: '전체', value: undefined },
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

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await documentApi.getList(activeCategory ? { category: activeCategory } : undefined));
    } catch {
      Alert.alert('오류', '문서 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading && documents.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <>
        <View style={styles.controlPanel}>
          <View style={styles.screenHead}>
            <View>
              <Text style={styles.screenKicker}>DOCUMENTS</Text>
              <Text style={styles.screenTitle}>문서 보관함</Text>
            </View>
            <Text style={styles.screenCount}>{documents.length}건</Text>
          </View>
          <FilterBar
            options={CATEGORIES}
            value={activeCategory}
            onChange={setActiveCategory}
          />
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
  controlPanel: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.card,
  },
  screenHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenKicker: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  screenTitle: {
    marginTop: 2,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  screenCount: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  list: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm, paddingBottom: 88 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  fileBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBadgeText: { color: Colors.surface, fontSize: FontSize.xs, fontWeight: '800' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  categoryChip: {
    backgroundColor: Colors.primary + '14',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.primaryDark, fontWeight: '700' },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  uploader: { fontSize: FontSize.xs, color: Colors.textMuted },
  arrow: { fontSize: 22, color: Colors.textMuted, lineHeight: 24 },
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
    ...Shadow.raised,
  },
  fabText: { color: Colors.surface, fontSize: 28, lineHeight: 32 },
});
