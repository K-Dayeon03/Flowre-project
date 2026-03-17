import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

const TYPES = [
  { key: 'MANNEQUIN', label: '마네킹 교체' },
  { key: 'HQ_VISIT', label: '본사 방문' },
  { key: 'VM_CHECK', label: 'VM 점검' },
  { key: 'OTHER', label: '기타' },
];

export default function ScheduleCreateScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('MANNEQUIN');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!dueDate.trim()) {
      Alert.alert('알림', '마감일을 입력해주세요.');
      return;
    }
    setLoading(true);
    // TODO: scheduleApi.create({ title, type, dueDate, assignee, description })
    setLoading(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* 유형 선택 */}
        <Field label="업무 유형">
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeBtn,
                  type === t.key && {
                    backgroundColor: Colors.scheduleType[t.key as keyof typeof Colors.scheduleType],
                    borderColor: Colors.scheduleType[t.key as keyof typeof Colors.scheduleType],
                  },
                ]}
                onPress={() => setType(t.key)}
              >
                <Text style={[styles.typeBtnText, type === t.key && styles.typeBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* 제목 */}
        <Field label="제목 *">
          <TextInput
            style={styles.input}
            placeholder="스케줄 제목을 입력하세요"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        {/* 마감일 */}
        <Field label="마감일 *">
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={Colors.textMuted}
            value={dueDate}
            onChangeText={setDueDate}
            // TODO: DateTimePicker 연동
          />
        </Field>

        {/* 담당자 */}
        <Field label="담당자">
          <TextInput
            style={styles.input}
            placeholder="담당자 이름 또는 '전체'"
            placeholderTextColor={Colors.textMuted}
            value={assignee}
            onChangeText={setAssignee}
          />
        </Field>

        {/* 내용 */}
        <Field label="내용">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="스케줄 상세 내용을 입력하세요"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </Field>
      </ScrollView>

      {/* 등록 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.submitBtnText}>스케줄 등록</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.md },
  field: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  typeBtnTextActive: { color: Colors.surface, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  textArea: { height: 120 },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '700' },
});
