import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import {
  AsTicket,
  AsTicketPriority,
  AsTicketStatus,
  InquiryStatus,
  InquiryTicket,
  supportApi,
} from '../../api/supportApi';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import { useAuthStore } from '../../store/useAuthStore';

type SupportTab = 'inquiries' | 'as-tickets';
type SupportRoute = RouteProp<MainStackParamList, 'Support'>;
type FaqCategory = 'ALL' | 'ACCOUNT' | 'INVENTORY' | 'STORE' | 'AS';

const FAQ_CATEGORIES: Array<{ key: FaqCategory; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'ACCOUNT', label: '계정' },
  { key: 'INVENTORY', label: '재고' },
  { key: 'STORE', label: '매장' },
  { key: 'AS', label: 'AS' },
];

const FAQ_ITEMS: Array<{ id: string; category: Exclude<FaqCategory, 'ALL'>; question: string; answer: string }> = [
  {
    id: 'faq-login',
    category: 'ACCOUNT',
    question: '로그인이 안 될 때는 어떻게 하나요?',
    answer: '매장 코드, 직원 번호, 비밀번호를 먼저 확인해주세요. 비밀번호를 잊은 경우 점장 또는 본사 직원 관리 화면에서 초기화할 수 있습니다.',
  },
  {
    id: 'faq-inventory-upload',
    category: 'INVENTORY',
    question: '재고 파일을 올렸는데 목록에 바로 안 보여요.',
    answer: '업로드 후 처리 결과가 반영되면 재고 목록을 새로고침합니다. 파일 형식이 맞지 않거나 상품 코드가 비어 있으면 일부 행은 제외될 수 있습니다.',
  },
  {
    id: 'faq-store-status',
    category: 'STORE',
    question: '매장 운영 상태는 어디서 확인하나요?',
    answer: '대시보드의 운영 매장 카드 또는 매장 현황 화면에서 확인할 수 있습니다. 현재는 상태 확인 중심으로 제공됩니다.',
  },
  {
    id: 'faq-as-urgent',
    category: 'AS',
    question: '긴급 AS는 어떤 기준으로 접수하나요?',
    answer: '결제, 영업, 재고 업로드처럼 당일 운영에 직접 영향을 주는 문제는 긴급으로 접수해주세요. 단순 문의는 일반 문의로 등록하면 됩니다.',
  },
];

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
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<SupportTab>(route.params?.initialTab ?? 'inquiries');
  const [query, setQuery] = useState(route.params?.query ?? '');
  const [inquiries, setInquiries] = useState<InquiryTicket[]>([]);
  const [asTickets, setAsTickets] = useState<AsTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<FaqCategory>('ALL');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [asTitle, setAsTitle] = useState('');
  const [asDescription, setAsDescription] = useState('');
  const [asPriority, setAsPriority] = useState<AsTicketPriority>('NORMAL');
  const canProcess = user?.role === 'ADMIN' || user?.role === 'HQ_STAFF' || user?.role === 'STORE_MANAGER';

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
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = category === 'ALL' || item.category === category;
      const matchesQuery = !normalizedQuery
        || item.question.toLowerCase().includes(normalizedQuery)
        || item.answer.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, normalizedQuery]);

  const unresolvedAs = asTickets.filter((item) => item.status !== 'DONE').length;
  const urgentAs = asTickets.filter((item) => item.priority === 'URGENT').length;
  const pendingInquiries = inquiries.filter((item) => item.status !== 'DONE').length;

  const createInquiry = async () => {
    if (!inquiryTitle.trim()) {
      Alert.alert('입력 필요', '문의 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const created = await supportApi.createInquiry({
        requesterName: user?.name ?? '매장 직원',
        title: inquiryTitle.trim(),
        content: inquiryContent.trim() || undefined,
      });
      setInquiries((prev) => [created, ...prev]);
      setInquiryTitle('');
      setInquiryContent('');
      setComposerOpen(false);
      setTab('inquiries');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '문의 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const createAsTicket = async () => {
    if (!asTitle.trim()) {
      Alert.alert('입력 필요', 'AS 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const created = await supportApi.createAsTicket({
        title: asTitle.trim(),
        description: asDescription.trim() || undefined,
        priority: asPriority,
      });
      setAsTickets((prev) => [created, ...prev]);
      setAsTitle('');
      setAsDescription('');
      setAsPriority('NORMAL');
      setComposerOpen(false);
      setTab('as-tickets');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? 'AS 접수에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const changeInquiryStatus = async (item: InquiryTicket, status: InquiryStatus) => {
    setProcessingId(item.id);
    try {
      const updated = await supportApi.changeInquiryStatus(item.id, status);
      setInquiries((prev) => prev.map((ticket) => ticket.id === item.id ? updated : ticket));
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '문의 상태 변경에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const changeAsTicketStatus = async (item: AsTicket, status: AsTicketStatus) => {
    setProcessingId(item.id);
    try {
      const updated = await supportApi.changeAsTicketStatus(item.id, status);
      setAsTickets((prev) => prev.map((ticket) => ticket.id === item.id ? updated : ticket));
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? 'AS 상태 변경에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.workspace} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>HELP BOARD</Text>
            <Text style={styles.title}>문의·AS 게시판</Text>
            <Text style={styles.subtitle}>FAQ를 먼저 확인하고, 해결되지 않으면 문의 또는 AS를 접수하세요.</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.outlineButton} onPress={load} activeOpacity={0.82}>
              <Text style={styles.outlineButtonText}>새로고침</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={() => setComposerOpen((value) => !value)} activeOpacity={0.82}>
              <Text style={styles.refreshText}>{composerOpen ? '작성 닫기' : '문의 작성'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="미처리 문의" value={pendingInquiries} color={Colors.warning} />
          <SummaryCard label="미처리 AS" value={unresolvedAs} color={Colors.primary} />
          <SummaryCard label="긴급 AS" value={urgentAs} color={Colors.error} />
        </View>

        <View style={styles.boardPanel}>
          <Text style={styles.boardTitle}>자주 묻는 질문</Text>
          <SearchBar value={query} onChangeText={setQuery} placeholder="FAQ, 제목, 매장, 요청자 검색" />
          <View style={styles.categoryRow}>
            {FAQ_CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.categoryChip, category === item.key && styles.categoryChipActive]}
                onPress={() => setCategory(item.key)}
                activeOpacity={0.82}
              >
                <Text style={[styles.categoryText, category === item.key && styles.categoryTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.faqList}>
            {filteredFaqs.length === 0 ? (
              <Text style={styles.emptyText}>검색된 FAQ가 없습니다.</Text>
            ) : filteredFaqs.map((item) => {
              const expanded = expandedFaqId === item.id;
              return (
                <TouchableOpacity key={item.id} style={styles.faqItem} onPress={() => setExpandedFaqId(expanded ? null : item.id)} activeOpacity={0.86}>
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqCategory}>{FAQ_CATEGORIES.find((entry) => entry.key === item.category)?.label}</Text>
                    <Text style={styles.faqQuestion} numberOfLines={expanded ? undefined : 1}>{item.question}</Text>
                    <Text style={styles.faqToggle}>{expanded ? '−' : '+'}</Text>
                  </View>
                  {expanded ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.tabs}>
          <TabButton label={`문의 ${filteredInquiries.length}`} active={tab === 'inquiries'} onPress={() => setTab('inquiries')} />
          <TabButton label={`AS ${filteredAsTickets.length}`} active={tab === 'as-tickets'} onPress={() => setTab('as-tickets')} />
        </View>

        {composerOpen ? (
          <View style={styles.composerGrid}>
            <View style={styles.formPanel}>
              <Text style={styles.formTitle}>일반 문의 작성</Text>
              <TextInput style={styles.input} value={inquiryTitle} onChangeText={setInquiryTitle} placeholder="문의 제목" placeholderTextColor={Colors.textMuted} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={inquiryContent}
                onChangeText={setInquiryContent}
                placeholder="확인한 FAQ와 추가 문의 내용을 입력하세요"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
              <TouchableOpacity style={[styles.submitButton, saving && styles.disabled]} onPress={createInquiry} disabled={saving} activeOpacity={0.82}>
                <Text style={styles.submitText}>{saving ? '등록 중...' : '문의 등록'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formPanel}>
              <Text style={styles.formTitle}>AS 접수</Text>
              <TextInput style={styles.input} value={asTitle} onChangeText={setAsTitle} placeholder="AS 제목" placeholderTextColor={Colors.textMuted} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={asDescription}
                onChangeText={setAsDescription}
                placeholder="장애 상황, 발생 위치, 재현 방법을 입력하세요"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
              <View style={styles.priorityRow}>
                {(['NORMAL', 'HIGH', 'URGENT'] as AsTicketPriority[]).map((priority) => (
                  <TouchableOpacity key={priority} style={[styles.priorityButton, asPriority === priority && styles.priorityButtonActive]} onPress={() => setAsPriority(priority)} activeOpacity={0.82}>
                    <Text style={[styles.priorityText, asPriority === priority && styles.priorityTextActive]}>
                      {priority === 'NORMAL' ? '보통' : priority === 'HIGH' ? '높음' : '긴급'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.submitButton, saving && styles.disabled]} onPress={createAsTicket} disabled={saving} activeOpacity={0.82}>
                <Text style={styles.submitText}>{saving ? '접수 중...' : 'AS 접수'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : tab === 'inquiries' ? (
          <View style={styles.list}>
            {filteredInquiries.length === 0 ? (
              <Text style={styles.emptyText}>표시할 문의가 없습니다.</Text>
            ) : (
              filteredInquiries.map((item) => (
                <View key={item.id} style={styles.boardPost}>
                  <View style={styles.rowMain}>
                    <Text style={styles.postType}>문의</Text>
                    <Text style={styles.rowTitle} numberOfLines={1}>Q. {item.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{item.storeName} · {item.requesterName} · {item.status === 'DONE' ? '답변 완료' : '답변 대기'}</Text>
                    {item.content ? <Text style={styles.rowContent} numberOfLines={2}>{item.content}</Text> : null}
                  </View>
                  <Badge label={INQUIRY_STATUS_LABEL[item.status]} color={item.status === 'PENDING' ? Colors.warning : Colors.primary} />
                  {canProcess && item.status !== 'IN_PROGRESS' ? (
                    <TouchableOpacity style={[styles.statusButton, processingId === item.id && styles.disabled]} onPress={() => changeInquiryStatus(item, 'IN_PROGRESS')} disabled={processingId === item.id} activeOpacity={0.82}>
                      <Text style={styles.statusButtonText}>처리</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canProcess && item.status !== 'DONE' ? (
                    <TouchableOpacity style={[styles.statusButton, styles.doneButton, processingId === item.id && styles.disabled]} onPress={() => changeInquiryStatus(item, 'DONE')} disabled={processingId === item.id} activeOpacity={0.82}>
                      <Text style={styles.statusButtonText}>완료</Text>
                    </TouchableOpacity>
                  ) : null}
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
                <View key={item.id} style={styles.boardPost}>
                  <View style={styles.rowMain}>
                    <Text style={styles.postType}>AS</Text>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.priority === 'URGENT' ? '[긴급] ' : ''}{item.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{item.storeName} · {item.status === 'DONE' ? '처리 완료' : '처리 대기'}</Text>
                    {item.description ? <Text style={styles.rowContent} numberOfLines={2}>{item.description}</Text> : null}
                  </View>
                  {item.priority === 'URGENT' ? <Badge label="긴급" color={Colors.error} subtle={false} /> : null}
                  <Badge label={AS_STATUS_LABEL[item.status]} color={item.status === 'NEW' ? Colors.warning : Colors.primary} />
                  {canProcess && item.status !== 'IN_PROGRESS' ? (
                    <TouchableOpacity style={[styles.statusButton, processingId === item.id && styles.disabled]} onPress={() => changeAsTicketStatus(item, 'IN_PROGRESS')} disabled={processingId === item.id} activeOpacity={0.82}>
                      <Text style={styles.statusButtonText}>처리</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canProcess && item.status !== 'DONE' ? (
                    <TouchableOpacity style={[styles.statusButton, styles.doneButton, processingId === item.id && styles.disabled]} onPress={() => changeAsTicketStatus(item, 'DONE')} disabled={processingId === item.id} activeOpacity={0.82}>
                      <Text style={styles.statusButtonText}>완료</Text>
                    </TouchableOpacity>
                  ) : null}
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
  return [item.title, 'requesterName' in item ? item.content : item.description, item.storeName, 'requesterName' in item ? item.requesterName : '']
    .some((value) => (value ?? '').toLowerCase().includes(query));
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  refreshText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' },
  outlineButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  outlineButtonText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '900' },
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
  tabTextActive: { color: '#FFFFFF' },
  boardPanel: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  boardTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '900' },
  categoryTextActive: { color: '#FFFFFF' },
  faqList: {
    gap: Spacing.sm,
  },
  faqItem: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  faqCategory: {
    minWidth: 44,
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  faqQuestion: {
    flex: 1,
    minWidth: 0,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  faqToggle: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: '900',
  },
  faqAnswer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    lineHeight: 21,
  },
  composerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  formPanel: {
    flex: 1,
    minWidth: 280,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  formTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  input: {
    minHeight: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  priorityButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  priorityButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.accentLight },
  priorityText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '900' },
  priorityTextActive: { color: Colors.primary },
  submitButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  submitText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' },
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
  boardPost: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  postType: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '900', marginBottom: 4 },
  rowTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  rowMeta: { marginTop: 3, color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  rowContent: { marginTop: 4, color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  statusButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  doneButton: { backgroundColor: Colors.success },
  statusButtonText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', padding: Spacing.xl },
  errorText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: '700' },
  loader: { marginTop: Spacing.xl },
});
