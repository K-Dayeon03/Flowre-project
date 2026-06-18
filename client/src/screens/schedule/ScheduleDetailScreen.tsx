import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import FavoriteToggle from '../../components/FavoriteToggle';

type Props = NativeStackScreenProps<MainStackParamList, 'ScheduleDetail'>;

const MOCK_DETAIL = {
  id: 1,
  title: '봄 시즌 마네킹 교체',
  type: 'MANNEQUIN',
  status: 'IN_PROGRESS',
  dueDate: '2025-03-11 18:00',
  assignee: '김민지',
  store: '강남점',
  description: '봄 시즌 신상품 착장으로 1층~2층 전체 마네킹 교체. 본사에서 배포된 SS 2025 VM 가이드라인 참고.',
  createdAt: '2025-03-08',
  createdBy: '이수진 (VMD팀)',
};

const TYPE_LABEL: Record<string, string> = {
  MANNEQUIN: '마네킹 교체',
  HQ_VISIT: '본사 방문',
  VM_CHECK: 'VM 점검',
  OTHER: '기타',
};

export default function ScheduleDetailScreen({ route, navigation }: Props) {
  const { scheduleId } = route.params;
  const [status, setStatus] = useState(MOCK_DETAIL.status);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <FavoriteToggle targetType="SCHEDULE" targetId={scheduleId} label={MOCK_DETAIL.title} />
      ),
    });
  }, [navigation, scheduleId]);

  const handleComplete = () => {
    Alert.alert('완료 처리', '이 스케줄을 완료 처리할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '완료',
        onPress: () => {
          setStatus('DONE');
          // TODO: API 호출 scheduleApi.complete(scheduleId)
        },
      },
    ]);
  };

  const isDone = status === 'DONE';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 상단 상태 배너 카드 */}
        <View style={styles.bannerCard}>
          <View style={[styles.typeBar, { backgroundColor: Colors.scheduleType[MOCK_DETAIL.type as keyof typeof Colors.scheduleType] }]} />
          <View style={styles.bannerContent}>
            <View style={styles.bannerTop}>
              <View style={[styles.typeChip, { backgroundColor: Colors.scheduleType[MOCK_DETAIL.type as keyof typeof Colors.scheduleType] + '20' }]}>
                <Text style={[styles.typeText, { color: Colors.scheduleType[MOCK_DETAIL.type as keyof typeof Colors.scheduleType] }]}>
                  {TYPE_LABEL[MOCK_DETAIL.type]}
                </Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: Colors.statusBadge[status as keyof typeof Colors.statusBadge] + '18' }]}>
                <View style={[styles.statusDot, { backgroundColor: Colors.statusBadge[status as keyof typeof Colors.statusBadge] }]} />
                <Text style={[styles.statusText, { color: Colors.statusBadge[status as keyof typeof Colors.statusBadge] }]}>
                  {status === 'PENDING' ? '대기' : status === 'IN_PROGRESS' ? '진행 중' : '완료'}
                </Text>
              </View>
            </View>
            <Text style={styles.title}>{MOCK_DETAIL.title}</Text>
            <Text style={styles.dueText}>마감 {MOCK_DETAIL.dueDate}</Text>
          </View>
        </View>

        {/* 메타 정보 */}
        <View style={styles.metaCard}>
          <MetaRow icon="📅" label="마감일" value={MOCK_DETAIL.dueDate} />
          <MetaRow icon="👤" label="담당자" value={MOCK_DETAIL.assignee} />
          <MetaRow icon="🏪" label="매장" value={MOCK_DETAIL.store} />
          <MetaRow icon="📝" label="등록일" value={MOCK_DETAIL.createdAt} />
          <MetaRow icon="👤" label="등록자" value={MOCK_DETAIL.createdBy} last />
        </View>

        {/* 내용 */}
        <View style={styles.descCard}>
          <Text style={styles.descLabel}>내용</Text>
          <Text style={styles.descText}>{MOCK_DETAIL.description}</Text>
        </View>
      </ScrollView>

      {/* 완료 버튼 */}
      {!isDone && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} activeOpacity={0.85}>
            <Text style={styles.completeBtnText}>완료 처리</Text>
          </TouchableOpacity>
        </View>
      )}

      {isDone && (
        <View style={styles.footer}>
          <View style={styles.doneLabel}>
            <Text style={styles.doneLabelText}>✓ 완료된 스케줄입니다</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function MetaRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.md },
  bannerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.card,
  },
  typeBar: { height: 4, width: '100%' },
  bannerContent: { padding: Spacing.md, gap: Spacing.sm },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.textPrimary, lineHeight: 28 },
  dueText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  metaRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaIcon: { fontSize: FontSize.md, width: 24 },
  metaLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 60 },
  metaValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl * 2,
    ...Shadow.card,
  },
  descLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  descText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24 },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '900' },
  doneLabel: {
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneLabelText: { color: Colors.success, fontSize: FontSize.md, fontWeight: '700' },
});
