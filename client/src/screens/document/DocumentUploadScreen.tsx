import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { DocumentCategory, documentApi } from '../../api/documentApi';
import { DocumentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DocumentStackParamList, 'DocumentUpload'>;

const CATEGORIES: Array<{ key: DocumentCategory; label: string }> = [
  { key: 'MANUAL', label: '매뉴얼' },
  { key: 'NOTICE', label: '공지' },
  { key: 'REPORT', label: '리포트' },
];

function inferContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

export default function DocumentUploadScreen({ navigation, route }: Props) {
  const documentId = route.params?.documentId;
  const isEdit = documentId != null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('MANUAL');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size?: number;
    mimeType?: string;
    uri?: string;
    file?: Blob;
  } | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    setInitialLoading(true);
    documentApi.getById(documentId)
      .then((document) => {
        setTitle(document.title);
        setCategory(document.category);
        setDescription(document.description ?? '');
      })
      .catch(() => Alert.alert('오류', '문서 정보를 불러오지 못했습니다.'))
      .finally(() => setInitialLoading(false));
  }, [documentId]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: '*/*',
      });

      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      setSelectedFile({
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
        file: 'file' in file ? file.file : undefined,
      });
    } catch {
      Alert.alert('오류', '파일 선택창을 열지 못했습니다.');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!isEdit && !selectedFile) {
      Alert.alert('알림', '파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const normalizedFileName = selectedFile?.name.trim() ?? '';
      const contentType = selectedFile?.mimeType ?? (normalizedFileName ? inferContentType(normalizedFileName) : undefined);
      const fileSize = selectedFile?.size;
      const presigned = normalizedFileName && contentType
        ? await documentApi.getPresignedUrl(normalizedFileName, contentType)
        : undefined;

      if (presigned && selectedFile && contentType) {
        let fileBlob: Blob;
        if (selectedFile.file) {
          fileBlob = selectedFile.file;
        } else if (selectedFile.uri) {
          fileBlob = await fetch(selectedFile.uri).then((response) => response.blob());
        } else {
          throw new Error('파일 경로를 찾을 수 없습니다.');
        }
        await documentApi.uploadToS3(presigned.presignedUrl, fileBlob, contentType);
      }

      const payload = {
        title: title.trim(),
        category,
        s3Key: presigned?.s3Key,
        description: description.trim() || undefined,
        fileType: contentType,
        fileSize,
      };

      if (isEdit && documentId) {
        await documentApi.update(documentId, payload);
      } else if (presigned?.s3Key) {
        await documentApi.create({ ...payload, s3Key: presigned.s3Key });
      }
      navigation.goBack();
    } catch {
      Alert.alert('오류', isEdit ? '문서를 수정하지 못했습니다.' : '문서를 업로드하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.filePicker} onPress={handlePickFile} activeOpacity={0.8}>
          <View style={styles.fileEmpty}>
            <Text style={styles.fileEmptyIcon}>파일</Text>
            <Text style={styles.fileEmptyText}>
              {selectedFile?.name ?? (isEdit ? '파일을 교체하려면 선택하세요' : '파일을 선택하세요')}
            </Text>
            <Text style={styles.fileEmptySubText}>
              {selectedFile?.size ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : 'PDF, 이미지, Word, Excel 지원'}
            </Text>
          </View>
        </TouchableOpacity>

        <Field label="카테고리">
          <View style={styles.categoryRow}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.categoryBtn, category === item.key && styles.categoryBtnActive]}
                onPress={() => setCategory(item.key)}
              >
                <Text style={[styles.categoryBtnText, category === item.key && styles.categoryBtnTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="문서 제목 *">
          <TextInput
            style={styles.input}
            placeholder="문서 제목을 입력하세요"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

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
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.uploadBtnText}>{isEdit ? '수정 저장' : '업로드'}</Text>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.md },
  filePicker: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
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
  fileEmptyIcon: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '800' },
  fileEmptyText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '500' },
  fileEmptySubText: { fontSize: FontSize.sm, color: Colors.textMuted },
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
