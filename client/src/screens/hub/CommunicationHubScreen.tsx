import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HubSearchResult, HubSummary, hubApi } from '../../api/hubApi';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';

const TYPE_LABEL = {
  NOTICE: '공지',
  DOCUMENT: '문서',
  SCHEDULE: '업무',
} as const;

export default function CommunicationHubScreen() {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<HubSummary | null>(null);
  const [results, setResults] = useState<HubSearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await hubApi.getSummary());
    } catch (e: any) {
      Alert.alert('조회 실패', e.message ?? '허브 요약을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const keyword = query.trim();
      if (keyword.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        setResults(await hubApi.search(keyword));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const openResult = (item: HubSearchResult) => {
    if (item.type === 'NOTICE') navigation.navigate('NoticeDetail', { noticeId: item.resourceId });
    if (item.type === 'DOCUMENT') navigation.navigate('DocumentDetail', { documentId: item.resourceId, title: item.title });
    if (item.type === 'SCHEDULE') navigation.navigate('ScheduleDetail', { scheduleId: item.resourceId });
  };

  const renderResult = ({ item }: { item: HubSearchResult }) => (
    <TouchableOpacity style={styles.resultRow} onPress={() => openResult(item)} activeOpacity={0.82}>
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{TYPE_LABEL[item.type]}</Text>
      </View>
      <View style={styles.resultMain}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultMeta}>{item.subtitle ?? '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>HUB</Text>
          <Text style={styles.title}>커뮤니케이션 허브</Text>
        </View>
      </View>

      {loading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.resourceId}`}
          renderItem={renderResult}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSummary} tintColor={Colors.primary} />}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.stack}>
              <View style={styles.grid}>
                <SummaryCard label="미확인 공지" value={summary?.unreadNoticeCount ?? 0} />
                <SummaryCard label="안읽은 채팅" value={summary?.unreadChatCount ?? 0} />
                <SummaryCard label="미완료 업무" value={summary?.pendingScheduleCount ?? 0} />
                <SummaryCard label="문의/AS" value={(summary?.pendingInquiryCount ?? 0) + (summary?.pendingAsCount ?? 0)} />
              </View>

              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="공지, 문서, 업무 검색"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="search"
              />

              {searching ? <ActivityIndicator color={Colors.primary} /> : null}

              {summary?.recentNotifications?.length ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>최근 알림</Text>
                  {summary.recentNotifications.slice(0, 3).map((item) => (
                    <Text key={item.id} style={styles.panelLine} numberOfLines={1}>
                      {item.read ? '' : '• '}{item.title}
                    </Text>
                  ))}
                </View>
              ) : null}

              {summary?.recentDocuments?.length ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>최근 문서</Text>
                  {summary.recentDocuments.slice(0, 3).map((item) => (
                    <TouchableOpacity key={item.id} onPress={() => navigation.navigate('DocumentDetail', { documentId: item.id, title: item.title })}>
                      <Text style={styles.panelLine} numberOfLines={1}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            query.trim().length >= 2 && !searching ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>검색 결과가 없습니다</Text>
                <Text style={styles.emptyDesc}>다른 검색어로 다시 찾아보세요.</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value.toLocaleString('ko-KR')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  kicker: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 96, gap: Spacing.sm },
  stack: { gap: Spacing.md },
  grid: { gap: Spacing.sm },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
  },
  summaryLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  summaryValue: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  panel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  panelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900', marginBottom: 4 },
  panelLine: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  resultRow: {
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
  typeBadge: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  typeBadgeText: { color: Colors.primary700, fontSize: FontSize.xs, fontWeight: '800' },
  resultMain: { flex: 1, gap: 3 },
  resultTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  resultMeta: { color: Colors.textMuted, fontSize: FontSize.sm },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: Spacing.xl },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});

