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
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { useScheduleStore } from '../../store/useScheduleStore';
import Calendar from '../../components/Calendar';

const TYPES = [
  { key: 'MANNEQUIN', label: '마네킹 교체' },
  { key: 'HQ_VISIT', label: '본사 방문' },
  { key: 'VM_CHECK', label: 'VM 점검' },
  { key: 'OTHER', label: '기타' },
];

export default function ScheduleCreateScreen() {
  const navigation = useNavigation();
  const createSchedule = useScheduleStore((s) => s.createSchedule);
  const loading = useScheduleStore((s) => s.loading);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('MANNEQUIN');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [description, setDescription] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!dueDate) {
      Alert.alert('알림', '마감일을 선택해주세요.');
      return;
    }
    try {
      await createSchedule({
        title,
        type: type as any,
        dueDate: `${dueDate}T00:00:00`,
        assignee: assignee || undefined,
        description: description || undefined,
      });
      navigation.goBack();
    } catch {
      Alert.alert('오류', '스케줄 등록에 실패했습니다.');
    }
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

        {/* 마감일 - 캘린더 선택 */}
        <Field label="마감일 *">
          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowCalendar(true)}>
            <Text style={dueDate ? styles.datePickerValue : styles.datePickerPlaceholder}>
              {dueDate || '날짜를 선택하세요'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
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

      {/* 캘린더 모달 */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>날짜 선택</Text>
            <Calendar
              selectedDate={dueDate}
              onDateSelect={(date) => {
                setDueDate(date);
                setShowCalendar(false);
              }}
            />
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCalendar(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  datePickerValue: { fontSize: FontSize.md, color: Colors.textPrimary },
  datePickerPlaceholder: { fontSize: FontSize.md, color: Colors.textMuted },
  calendarIcon: { fontSize: 18 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalCancelBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: FontSize.md, color: Colors.textMuted },
});
