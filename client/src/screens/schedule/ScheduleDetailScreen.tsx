import React, { useState } from 'react';
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
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ScheduleStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'ScheduleDetail'>;

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
  const [status, setStatus] = useState(MOCK_DETAIL.status);

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
        {/* 상태 배너 */}
        <View style={[styles.statusBanner, { backgroundColor: Colors.statusBadge[status as keyof typeof Colors.statusBadge] + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: Colors.statusBadge[status as keyof typeof Colors.statusBadge] }]} />
          <Text style={[styles.statusText, { color: Colors.statusBadge[status as keyof typeof Colors.statusBadge] }]}>
            {status === 'PENDING' ? '대기' : status === 'IN_PROGRESS' ? '진행 중' : '완료'}
          </Text>
        </View>

        {/* 제목 */}
        <View style={styles.titleArea}>
          <View style={[styles.typeChip, { backgroundColor: Colors.scheduleType[MOCK_DETAIL.type as keyof typeof Colors.scheduleType] + '20' }]}>
            <Text style={[styles.typeText, { color: Colors.scheduleType[MOCK_DETAIL.type as keyof typeof Colors.scheduleType] }]}>
              {TYPE_LABEL[MOCK_DETAIL.type]}
            </Text>
          </View>
          <Text style={styles.title}>{MOCK_DETAIL.title}</Text>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FontSize.sm, fontWeight: '600' },
  titleArea: { marginBottom: Spacing.md },
  typeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, lineHeight: 30 },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl * 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  descLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  descText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completeBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  completeBtnText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '700' },
  doneLabel: {
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  doneLabelText: { color: Colors.success, fontSize: FontSize.md, fontWeight: '600' },
});
