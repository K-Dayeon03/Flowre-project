import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import {
  AsTicket,
  AsTicketStatus,
  InquiryStatus,
  InquiryTicket,
  supportApi,
} from '../../api/supportApi';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';

type SupportTab = 'inquiries' | 'as-tickets';
type SupportRoute = RouteProp<MainStackParamList, 'Support'>;

const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '답변 중',
  DONE: '완료',
};

const AS_STATUS_LABEL: Record<AsTicketStatus, string> = {
  NEW: '신규',
  IN_PROGRESS: '처리 중',
  DONE: '완료',
};

export default function SupportScreen() {
  const route = useRoute<SupportRoute>();
  const [tab, setTab] = useState<SupportTab>(route.params?.initialTab ?? 'inquiries');
  const [query, setQuery] = useState(route.params?.query ?? '');
  const [inquiries, setInquiries] = useState<InquiryTicket[]>([]);
  const [asTickets, setAsTickets] = useState<AsTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTab(route.params?.initialTab ?? 'inquiries');
    setQuery(route.params?.query ?? '');
  }, [route.params?.initialTab, route.params?.query]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextInquiries, nextAsTickets] = await Promise.all([
        supportApi.getInquiries({ limit: 30 }),
        supportApi.getAsTickets({ limit: 30 }),
      ]);
      setInquiries(nextInquiries);
      setAsTickets(nextAsTickets);
    } catch {
      setError('문의·AS 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredInquiries = useMemo(() => {
    if (!normalizedQuery) return inquiries;
    return inquiries.filter((item) => containsSupportQuery(item, normalizedQuery));
  }, [inquiries, normalizedQuery]);
  const filteredAsTickets = useMemo(() => {
    if (!normalizedQuery) return asTickets;
    return asTickets.filter((item) => containsSupportQuery(item, normalizedQuery));
  }, [asTickets, normalizedQuery]);

  const unresolvedAs = asTickets.filter((item) => item.status !== 'DONE').length;
  const urgentAs = asTickets.filter((item) => item.priority === 'URGENT').length;
  const pendingInquiries = inquiries.filter((item) => item.status !== 'DONE').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.workspace} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>SUPPORT QUEUE</Text>
            <Text style={styles.title}>문의 및 장애 대응</Text>
            <Text style={styles.subtitle}>매장 문의와 AS 접수 상태를 한 곳에서 확인합니다.</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={load} activeOpacity={0.82}>
            <Text style={styles.refreshText}>새로고침</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="미처리 문의" value={pendingInquiries} color={Colors.warning} />
          <SummaryCard label="미처리 AS" value={unresolvedAs} color={Colors.primary} />
          <SummaryCard label="긴급 AS" value={urgentAs} color={Colors.error} />
        </View>

        <SearchBar value={query} onChangeText={setQuery} placeholder="제목, 매장, 요청자 검색" />

        <View style={styles.tabs}>
          <TabButton label={`문의 ${filteredInquiries.length}`} active={tab === 'inquiries'} onPress={() => setTab('inquiries')} />
          <TabButton label={`AS ${filteredAsTickets.length}`} active={tab === 'as-tickets'} onPress={() => setTab('as-tickets')} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : tab === 'inquiries' ? (
          <View style={styles.list}>
            {filteredInquiries.length === 0 ? (
              <Text style={styles.emptyText}>표시할 문의가 없습니다.</Text>
            ) : (
              filteredInquiries.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{item.storeName} · {item.requesterName}</Text>
                  </View>
                  <Badge label={INQUIRY_STATUS_LABEL[item.status]} color={item.status === 'PENDING' ? Colors.warning : Colors.primary} />
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredAsTickets.length === 0 ? (
              <Text style={styles.emptyText}>표시할 AS 접수가 없습니다.</Text>
            ) : (
              filteredAsTickets.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{item.storeName} · {item.requesterName}</Text>
                  </View>
                  {item.priority === 'URGENT' ? <Badge label="긴급" color={Colors.error} subtle={false} /> : null}
                  <Badge label={AS_STATUS_LABEL[item.status]} color={item.status === 'NEW' ? Colors.warning : Colors.primary} />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function containsSupportQuery(item: InquiryTicket | AsTicket, query: string) {
  return [item.title, item.content, item.storeName, item.requesterName]
    .some((value) => value.toLowerCase().includes(query));
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color }]}>{value}건</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress} activeOpacity={0.82}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  workspace: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  kicker: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '900' },
  title: { marginTop: Spacing.xs, color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900' },
  subtitle: { marginTop: Spacing.xs, color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  refreshButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  refreshText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryCard: {
    flex: 1,
    flexBasis: 160,
    minHeight: 82,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '900' },
  summaryLabel: { marginTop: 2, color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '900' },
  tabTextActive: { color: Colors.surface },
  list: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadow.card,
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  rowMeta: { marginTop: 3, color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', padding: Spacing.xl },
  errorText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: '700' },
  loader: { marginTop: Spacing.xl },
});
