import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import { Document, documentApi } from '../../api/documentApi';
import FavoriteToggle from '../../components/FavoriteToggle';

type Props = NativeStackScreenProps<MainStackParamList, 'DocumentDetail'>;

const CATEGORY_LABEL = {
  MANUAL: '매뉴얼',
  NOTICE: '공지',
  REPORT: '리포트',
} as const;

export default function DocumentDetailScreen({ navigation, route }: Props) {
  const { documentId } = route.params;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  // 수정 화면에서 돌아왔을 때도 최신 내용이 반영되도록 포커스 시마다 재조회한다.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      documentApi.getById(documentId)
        .then((doc) => { if (active) setDocument(doc); })
        .catch(() => { if (active) Alert.alert('오류', '문서를 불러오지 못했습니다.'); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [documentId])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <FavoriteToggle targetType="DOCUMENT" targetId={documentId} label={document?.title ?? route.params.title} />
      ),
    });
  }, [document?.title, documentId, navigation, route.params.title]);

  const openFile = async () => {
    if (!document?.s3Url) return;
    const canOpen = await Linking.canOpenURL(document.s3Url);
    if (!canOpen) {
      Alert.alert('오류', '파일 URL을 열 수 없습니다.');
      return;
    }
    await Linking.openURL(document.s3Url);
  };

  const handleDelete = () => {
    if (!document) return;
    Alert.alert('문서 삭제', '이 문서를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await documentApi.delete(document.id);
            navigation.goBack();
          } catch {
            Alert.alert('오류', '문서를 삭제하지 못했습니다.');
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

  if (!document) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container}>
        <View style={styles.previewArea}>
          <Text style={styles.fileTypeText}>{document.fileType ?? 'FILE'}</Text>
        </View>

        <Text style={styles.title}>{document.title}</Text>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{CATEGORY_LABEL[document.category]}</Text>
        </View>

        <View style={styles.metaCard}>
          <MetaRow label="업로더" value={document.uploader} />
          <MetaRow label="업로드일" value={document.createdAt?.split('T')[0] ?? '-'} />
          <MetaRow label="파일 크기" value={document.size} last />
        </View>

        <View style={styles.descCard}>
          <Text style={styles.descLabel}>설명</Text>
          <Text style={styles.descText}>{document.description || '설명이 없습니다.'}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.previewBtn} onPress={openFile} activeOpacity={0.8}>
            <Text style={styles.previewBtnText}>미리보기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={openFile} activeOpacity={0.8}>
            <Text style={styles.downloadBtnText}>다운로드</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('DocumentUpload', { documentId: document.id })}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>수정</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Text style={styles.deleteBtnText}>삭제</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.md },
  previewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  fileTypeText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '800' },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.sm },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '14',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.primaryDark, fontWeight: '700' },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  metaRow: { flexDirection: 'row', paddingVertical: Spacing.sm + 2 },
  metaRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaLabel: { width: 80, fontSize: FontSize.sm, color: Colors.textSecondary },
  metaValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  descLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  descText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  previewBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  downloadBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '700' },
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  editBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  deleteBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
});
