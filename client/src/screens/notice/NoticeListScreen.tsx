import React, { useEffect, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { HomeStackParamList } from '../../navigation/types';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canCreateNotices } from '../home/homePermissions';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';

type Props = NativeStackScreenProps<HomeStackParamList, 'NoticeList'>;

/** ISO 날짜를 공지 목록 표시용으로 변환합니다. */
function formatDate(value?: string) {
  if (!value) return '-';
  return value.split('T')[0];
}

export default function NoticeListScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const notices = useNoticeStore((s) => s.notices);
  const fetchNotices = useNoticeStore((s) => s.fetchNotices);
  const fetchUnreadCount = useNoticeStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    fetchNotices();
    fetchUnreadCount();
  }, [fetchNotices, fetchUnreadCount]);

  const sortedNotices = useMemo(
    () => [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [notices]
  );
  const canWrite = canCreateNotices(user?.role);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {sortedNotices.length === 0 ? (
          <Card>
            <EmptyState icon="📣" title="등록된 공지가 없습니다." />
          </Card>
        ) : (
          sortedNotices.map((notice) => (
            <TouchableOpacity
              key={notice.id}
              style={[styles.noticeCard, !notice.read && styles.noticeCardUnread]}
              onPress={() => navigation.navigate('NoticeDetail', { noticeId: notice.id })}
              activeOpacity={0.86}
            >
              <View style={styles.noticeTop}>
                <View style={styles.badges}>
                  {notice.pinned ? <Badge label="상단고정" color={Colors.primary} /> : null}
                  {!notice.read ? <Badge label="안읽음" color={Colors.error} subtle={false} /> : null}
                </View>
                <Text style={styles.date}>{formatDate(notice.createdAt)}</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>{notice.title}</Text>
              <Text style={styles.contentText} numberOfLines={2}>{notice.content || '내용 없음'}</Text>
              <Text style={styles.author}>{notice.authorName}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {canWrite ? (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NoticeCreate')} activeOpacity={0.86}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  noticeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  noticeCardUnread: {
    borderColor: `${Colors.accent}88`,
  },
  noticeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  date: { color: Colors.textMuted, fontSize: FontSize.xs },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  contentText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 19,
    marginTop: Spacing.xs,
  },
  author: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.raised,
  },
  fabText: { color: Colors.surface, fontSize: 28, lineHeight: 32, fontWeight: '800' },
});
