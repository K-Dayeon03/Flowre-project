import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { HomeStackParamList } from '../../navigation/types';
import { Notice, noticeApi } from '../../api/noticeApi';
import { useNoticeStore } from '../../store/useNoticeStore';
import Badge from '../../components/Badge';
import Card from '../../components/Card';

type Props = NativeStackScreenProps<HomeStackParamList, 'NoticeDetail'>;

/** ISO 날짜를 상세 표시용으로 변환합니다. */
function formatDateTime(value?: string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

export default function NoticeDetailScreen({ route }: Props) {
  const { noticeId } = route.params;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const markRead = useNoticeStore((s) => s.markRead);

  useEffect(() => {
    let mounted = true;
    noticeApi.getNotice(noticeId)
      .then((data) => {
        if (mounted) setNotice(data);
        if (!data.read) {
          markRead(noticeId).catch(() => {});
        }
      })
      .catch(() => Alert.alert('오류', '공지를 불러오지 못했습니다.'))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [markRead, noticeId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!notice) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.badgeRow}>
            {notice.pinned ? <Badge label="상단고정" color={Colors.primary} /> : null}
          </View>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.meta}>{notice.authorName} · {formatDateTime(notice.createdAt)}</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{notice.content || '내용 없음'}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.md },
  card: { borderRadius: Radius.lg },
  badgeRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.textPrimary,
    lineHeight: 31,
  },
  meta: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
});
