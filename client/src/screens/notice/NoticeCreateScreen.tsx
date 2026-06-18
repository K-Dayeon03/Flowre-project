import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canCreateNotices } from '../home/homePermissions';
import Card from '../../components/Card';
import GradientButton from '../../components/GradientButton';

type Props = NativeStackScreenProps<MainStackParamList, 'NoticeCreate'>;

export default function NoticeCreateScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const createNotice = useNoticeStore((s) => s.createNotice);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const canWrite = canCreateNotices(user?.role);

  const handleSubmit = async () => {
    if (!canWrite) {
      Alert.alert('권한 없음', '공지 작성 권한이 없습니다.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('입력 필요', '공지 제목을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const created = await createNotice({ title: title.trim(), content: content.trim(), pinned });
      navigation.replace('NoticeDetail', { noticeId: created.id });
    } catch {
      Alert.alert('오류', '공지를 작성하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.input}
              placeholder="공지 제목"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>본문</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="공지 내용을 입력하세요"
              placeholderTextColor={Colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.toggleRow} onPress={() => setPinned((value) => !value)} activeOpacity={0.82}>
            <View style={[styles.checkbox, pinned && styles.checkboxActive]}>
              {pinned ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.toggleText}>상단고정</Text>
          </TouchableOpacity>

          <GradientButton title="공지 등록" onPress={handleSubmit} loading={loading} disabled={loading || !canWrite} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: Spacing.md },
  card: {
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  inputGroup: { gap: Spacing.xs },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  textarea: {
    minHeight: 180,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  toggleText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
});
