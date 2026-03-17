import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

const CATEGORIES = [
  { key: 'MANUAL', label: '매뉴얼' },
  { key: 'NOTICE', label: '공지' },
  { key: 'REPORT', label: '리포트' },
];

export default function DocumentUploadScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('MANUAL');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFilePick = async () => {
    // TODO: DocumentPicker.getDocumentAsync() — Expo Document Picker 연동
    // Presigned URL 방식: 서버에서 URL 발급 → S3 직접 업로드
    setSelectedFile({ name: 'ss2025-vm-guide.pdf', size: '4.2MB' });
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('알림', '파일을 선택해주세요.');
      return;
    }
    setLoading(true);
    // TODO:
    // 1. documentApi.getPresignedUrl(fileName) → { presignedUrl, s3Key }
    // 2. fetch(presignedUrl, { method: 'PUT', body: file })
    // 3. documentApi.create({ title, category, description, s3Key })
    setLoading(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* 파일 선택 영역 */}
        <TouchableOpacity style={styles.filePicker} onPress={handleFilePick} activeOpacity={0.7}>
          {selectedFile ? (
            <View style={styles.fileSelected}>
              <Text style={styles.fileIcon}>📄</Text>
              <View>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>{selectedFile.size}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Text style={styles.removeFile}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fileEmpty}>
              <Text style={styles.fileEmptyIcon}>📎</Text>
              <Text style={styles.fileEmptyText}>파일을 선택하세요</Text>
              <Text style={styles.fileEmptySubText}>PDF, 이미지, Word, Excel 지원</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 카테고리 */}
        <Field label="카테고리">
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.categoryBtn, category === c.key && styles.categoryBtnActive]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[styles.categoryBtnText, category === c.key && styles.categoryBtnTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* 제목 */}
        <Field label="문서 제목 *">
          <TextInput
            style={styles.input}
            placeholder="문서 제목을 입력하세요"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        {/* 설명 */}
        <Field label="설명">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="문서에 대한 간단한 설명을 입력하세요 (선택)"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadBtn, loading && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.uploadBtnText}>업로드</Text>
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
  filePicker: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  fileEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  fileEmptyIcon: { fontSize: 40 },
  fileEmptyText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '500' },
  fileEmptySubText: { fontSize: FontSize.sm, color: Colors.textMuted },
  fileSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  fileIcon: { fontSize: 32 },
  fileName: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  fileSize: { fontSize: FontSize.sm, color: Colors.textSecondary },
  removeFile: { fontSize: FontSize.lg, color: Colors.textMuted, padding: Spacing.xs },
  field: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  categoryRow: { flexDirection: 'row', gap: Spacing.sm },
  categoryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  categoryBtnTextActive: { color: Colors.surface, fontWeight: '600' },
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
  textArea: { height: 100 },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '700' },
});
