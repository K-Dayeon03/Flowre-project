import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { DocumentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DocumentStackParamList, 'DocumentDetail'>;

const MOCK_DETAIL = {
  id: 1,
  title: 'SS 2025 VM 가이드라인',
  category: '매뉴얼',
  fileType: 'pdf',
  size: '4.2MB',
  uploader: 'VMD팀 이수진',
  date: '2025-03-10',
  description: '2025 봄/여름 시즌 VM 가이드라인. 마네킹 착장, 선반 구성, 집기 배치 기준 포함.',
  s3Url: 'https://s3.amazonaws.com/flowre/documents/ss2025-vm-guide.pdf',
};

export default function DocumentDetailScreen({ route }: Props) {
  const handleDownload = () => {
    Alert.alert('다운로드', `${MOCK_DETAIL.title} 파일을 다운로드합니다.`);
    // TODO: FileSystem.downloadAsync(s3Url) — Expo FileSystem 연동
  };

  const handlePreview = () => {
    // TODO: WebView로 PDF 미리보기 또는 Expo WebBrowser.openBrowserAsync(s3Url)
    Alert.alert('미리보기', 'PDF 뷰어로 연결합니다.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container}>
        {/* 파일 아이콘 영역 */}
        <View style={styles.previewArea}>
          <Text style={styles.fileEmoji}>📄</Text>
          <View style={styles.fileTypeBadge}>
            <Text style={styles.fileTypeText}>{MOCK_DETAIL.fileType.toUpperCase()}</Text>
          </View>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>{MOCK_DETAIL.title}</Text>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{MOCK_DETAIL.category}</Text>
        </View>

        {/* 메타 정보 */}
        <View style={styles.metaCard}>
          <MetaRow label="업로더" value={MOCK_DETAIL.uploader} />
          <MetaRow label="업로드일" value={MOCK_DETAIL.date} />
          <MetaRow label="파일 크기" value={MOCK_DETAIL.size} last />
        </View>

        {/* 설명 */}
        <View style={styles.descCard}>
          <Text style={styles.descLabel}>설명</Text>
          <Text style={styles.descText}>{MOCK_DETAIL.description}</Text>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.previewBtn} onPress={handlePreview} activeOpacity={0.8}>
            <Text style={styles.previewBtnText}>미리보기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8}>
            <Text style={styles.downloadBtnText}>다운로드</Text>
          </TouchableOpacity>
        </View>
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
  container: { flex: 1, padding: Spacing.md },
  previewArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  fileEmoji: { fontSize: 64 },
  fileTypeBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  fileTypeText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '600' },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  metaRow: { flexDirection: 'row', paddingVertical: Spacing.sm + 2 },
  metaRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaLabel: { width: 80, fontSize: FontSize.sm, color: Colors.textSecondary },
  metaValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  descLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  descText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl * 2 },
  previewBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  previewBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
  downloadBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  downloadBtnText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '600' },
});
