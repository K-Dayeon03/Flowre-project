import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AttendanceRecord, attendanceApi } from '../../api/attendanceApi';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

const STATUS_LABEL = {
  WORKING: '근무중',
  OFF: '퇴근',
  ON_LEAVE: '휴무',
} as const;

function canViewTeam(role?: string) {
  return role === 'STORE_MANAGER' || role === 'HQ_STAFF' || role === 'ADMIN';
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes}분`;
}

export default function AttendanceScreen() {
  const user = useAuthStore((s) => s.user);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [teamRecords, setTeamRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const todayRecord = useMemo(
    () => myRecords.find((record) => record.workDate === new Date().toISOString().slice(0, 10)),
    [myRecords]
  );
  const isWorking = todayRecord?.status === 'WORKING';

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, team] = await Promise.all([
        attendanceApi.getMyRecords({ limit: 30 }),
        canViewTeam(user?.role) ? attendanceApi.getRecords({ limit: 100 }).catch(() => []) : Promise.resolve([]),
      ]);
      setMyRecords(mine);
      setTeamRecords(team);
    } catch (e: any) {
      Alert.alert('조회 실패', e.message ?? '근태 기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const submitClock = async () => {
    setProcessing(true);
    try {
      if (isWorking) {
        await attendanceApi.clockOut();
        Alert.alert('퇴근 완료', '오늘 근무 시간이 기록되었습니다.');
      } else {
        await attendanceApi.clockIn();
        Alert.alert('출근 완료', '근무 상태가 근무중으로 변경되었습니다.');
      }
      await loadAttendance();
    } catch (e: any) {
      Alert.alert('처리 실패', e.message ?? '근태 처리를 완료하지 못했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const renderTeamRecord = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.rowCard}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.userName}</Text>
        <Text style={styles.rowMeta}>{item.storeName} · {formatTime(item.clockInAt)} - {formatTime(item.clockOutAt)}</Text>
      </View>
      <View style={[styles.statusBadge, item.status === 'WORKING' ? styles.statusWorking : styles.statusOff]}>
        <Text style={[styles.statusText, item.status === 'WORKING' ? styles.statusTextWorking : styles.statusTextOff]}>
          {STATUS_LABEL[item.status]}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ATTENDANCE</Text>
          <Text style={styles.title}>근태 관리</Text>
        </View>
        <TouchableOpacity
          style={[styles.clockButton, isWorking && styles.clockOutButton]}
          onPress={submitClock}
          disabled={processing}
        >
          <Text style={styles.clockButtonText}>{processing ? '처리중' : isWorking ? '퇴근' : '출근'}</Text>
        </TouchableOpacity>
      </View>

      {loading && myRecords.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={canViewTeam(user?.role) ? teamRecords : myRecords}
          keyExtractor={(item) => String(item.id)}
          renderItem={canViewTeam(user?.role) ? renderTeamRecord : ({ item }) => <MyRecordCard item={item} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAttendance} tintColor={Colors.primary} />}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>오늘 상태</Text>
              <Text style={styles.summaryValue}>{todayRecord ? STATUS_LABEL[todayRecord.status] : '출근 전'}</Text>
              <Text style={styles.summaryMeta}>
                {todayRecord
                  ? `${formatTime(todayRecord.clockInAt)} - ${formatTime(todayRecord.clockOutAt)} · ${formatMinutes(todayRecord.totalMinutes)}`
                  : '출근 버튼을 눌러 오늘 근무를 시작하세요.'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>근태 기록이 없습니다</Text>
              <Text style={styles.emptyDesc}>출근/퇴근 기록이 생기면 여기에 표시됩니다.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function MyRecordCard({ item }: { item: AttendanceRecord }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.workDate}</Text>
        <Text style={styles.rowMeta}>{formatTime(item.clockInAt)} - {formatTime(item.clockOutAt)}</Text>
      </View>
      <View style={styles.minutesBox}>
        <Text style={styles.minutesText}>{formatMinutes(item.totalMinutes)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  kicker: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900' },
  clockButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  clockOutButton: { backgroundColor: Colors.danger },
  clockButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 96, gap: Spacing.sm },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    ...Shadow.card,
  },
  summaryLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  summaryValue: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900' },
  summaryMeta: { color: Colors.textSecondary, fontSize: FontSize.sm },
  rowCard: {
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
  rowMain: { flex: 1, gap: 3 },
  rowTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  rowMeta: { color: Colors.textMuted, fontSize: FontSize.sm },
  statusBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusWorking: { backgroundColor: Colors.success50, borderColor: Colors.success + '55' },
  statusOff: { backgroundColor: Colors.surfaceMuted, borderColor: Colors.border },
  statusText: { fontSize: FontSize.xs, fontWeight: '800' },
  statusTextWorking: { color: Colors.success700 },
  statusTextOff: { color: Colors.textSecondary },
  minutesBox: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  minutesText: { color: Colors.primary700, fontSize: FontSize.xs, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: Spacing.xl },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});

