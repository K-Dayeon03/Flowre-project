import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import { Schedule, scheduleApi } from '../../api/scheduleApi';
import { useScheduleStore } from '../../store/useScheduleStore';
import FavoriteToggle from '../../components/FavoriteToggle';

type Props = NativeStackScreenProps<MainStackParamList, 'ScheduleDetail'>;

const TYPE_LABEL: Record<string, string> = {
  MANNEQUIN: '마네킹 교체',
  HQ_VISIT: '본사 방문',
  VM_CHECK: 'VM 점검',
  OTHER: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return value.split('T')[0];
}

export default function ScheduleDetailScreen({ route, navigation }: Props) {
  const { scheduleId } = route.params;
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const completeSchedule = useScheduleStore((s) => s.completeSchedule);
  const deleteSchedule = useScheduleStore((s) => s.deleteSchedule);

  useLayoutEffect(() => {
    if (!schedule) return;
    navigation.setOptions({
      title: schedule.title,
      headerRight: () => (
        <FavoriteToggle targetType="SCHEDULE" targetId={scheduleId} label={schedule.title} />
      ),
    });
  }, [navigation, scheduleId, schedule]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      scheduleApi.getById(scheduleId)
        .then((data) => { if (mounted) setSchedule(data); })
        .catch(() => Alert.alert('오류', '스케줄을 불러오지 못했습니다.'))
        .finally(() => { if (mounted) setLoading(false); });
      return () => { mounted = false; };
    }, [scheduleId])
  );

  const handleComplete = () => {
    if (!schedule || schedule.status === 'DONE') return;
    Alert.alert('완료 처리', '이 스케줄을 완료 처리할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '완료',
        onPress: async () => {
          try {
            await completeSchedule(scheduleId);
            setSchedule((prev) => prev ? { ...prev, status: 'DONE' } : prev);
          } catch {
            Alert.alert('오류', '완료 처리에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('스케줄 삭제', '이 스케줄을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSchedule(scheduleId);
            navigation.goBack();
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) return null;

  const typeColor = Colors.scheduleType[schedule.type as keyof typeof Colors.scheduleType] ?? Colors.textMuted;
  const statusColor = Colors.statusBadge[schedule.status as keyof typeof Colors.statusBadge] ?? Colors.textMuted;
  const isDone = schedule.status === 'DONE';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 상단 배너 */}
        <View style={styles.bannerCard}>
          <View style={[styles.typeBar, { backgroundColor: typeColor }]} />
          <View style={styles.bannerContent}>
            <View style={styles.bannerTop}>
              <View style={[styles.typeChip, { backgroundColor: typeColor + '20' }]}>
                <Text style={[styles.typeText, { color: typeColor }]}>
                  {TYPE_LABEL[schedule.type] ?? schedule.type}
                </Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {STATUS_LABEL[schedule.status] ?? schedule.status}
                </Text>
              </View>
            </View>
            <Text style={styles.title}>{schedule.title}</Text>
            <Text style={styles.dueText}>마감 {formatDate(schedule.dueDate)}</Text>
          </View>
        </View>

        {/* 메타 정보 */}
        <View style={styles.metaCard}>
          <MetaRow icon="📅" label="마감일" value={formatDate(schedule.dueDate)} />
          <MetaRow icon="👤" label="담당자" value={schedule.assignee ?? '-'} />
          <MetaRow icon="📝" label="등록일" value={formatDate(schedule.createdAt)} />
          <MetaRow icon="👤" label="등록자" value={schedule.createdBy ?? '-'} last />
        </View>

        {/* 내용 */}
        {schedule.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>내용</Text>
            <Text style={styles.descText}>{schedule.description}</Text>
          </View>
        ) : null}

        {/* 삭제 버튼 */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>스케줄 삭제</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xl * 3 }} />
      </ScrollView>

      {/* 완료 버튼 */}
      <View style={styles.footer}>
        {!isDone ? (
          <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} activeOpacity={0.85}>
            <Text style={styles.completeBtnText}>완료 처리</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.doneLabel}>
            <Text style={styles.doneLabelText}>✓ 완료된 스케줄입니다</Text>
          </View>
        )}
      </View>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  descLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  descText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24 },
  deleteBtn: {
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  deleteBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.error },
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
