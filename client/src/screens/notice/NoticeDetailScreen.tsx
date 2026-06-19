import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import { Notice, noticeApi } from '../../api/noticeApi';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canCreateNotices } from '../home/homePermissions';
import Badge from '../../components/Badge';
import Card from '../../components/Card';

type Props = NativeStackScreenProps<MainStackParamList, 'NoticeDetail'>;

function formatDateTime(value?: string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

export default function NoticeDetailScreen({ route, navigation }: Props) {
  const { noticeId } = route.params;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPinned, setEditPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const markRead = useNoticeStore((s) => s.markRead);
  const updateNotice = useNoticeStore((s) => s.updateNotice);
  const deleteNotice = useNoticeStore((s) => s.deleteNotice);
  const user = useAuthStore((s) => s.user);
  const canEdit = canCreateNotices(user?.role);

  useLayoutEffect(() => {
    if (!canEdit || !notice) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openEdit} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>수정</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, canEdit, notice]);

  useEffect(() => {
    let mounted = true;
    noticeApi.getNotice(noticeId)
      .then((data) => {
        if (mounted) setNotice(data);
        if (!data.read) markRead(noticeId).catch(() => {});
      })
      .catch(() => Alert.alert('오류', '공지를 불러오지 못했습니다.'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [markRead, noticeId]);

  function openEdit() {
    if (!notice) return;
    setEditTitle(notice.title);
    setEditContent(notice.content ?? '');
    setEditPinned(notice.pinned);
    setEditVisible(true);
  }

  async function handleSave() {
    if (!editTitle.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateNotice(noticeId, {
        title: editTitle.trim(),
        content: editContent.trim() || undefined,
        pinned: editPinned,
      });
      setNotice(updated);
      setEditVisible(false);
    } catch {
      Alert.alert('오류', '공지를 수정하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('공지 삭제', '이 공지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNotice(noticeId);
            navigation.goBack();
          } catch {
            Alert.alert('오류', '공지를 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  }

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

        {canEdit && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.85}>
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Text style={styles.deleteBtnText}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>공지 수정</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDim]}>
                {saving ? '저장 중…' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>제목 *</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="공지 제목"
              placeholderTextColor={Colors.textMuted}
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>내용</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="공지 내용"
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>상단 고정</Text>
              <Switch
                value={editPinned}
                onValueChange={setEditPinned}
                trackColor={{ true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.error + '12',
    borderWidth: 1,
    borderColor: Colors.error + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.error,
  },
  headerBtn: { paddingHorizontal: Spacing.sm },
  headerBtnText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700' },
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  modalCancel: { fontSize: FontSize.md, color: Colors.textSecondary },
  modalSave: { fontSize: FontSize.md, fontWeight: '700', color: Colors.accent },
  modalSaveDim: { opacity: 0.4 },
  modalScroll: { flex: 1 },
  modalContent: { padding: Spacing.md, gap: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  textarea: { minHeight: 140 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
});
