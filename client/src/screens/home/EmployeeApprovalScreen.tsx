import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { Employee, employeeApi } from '../../api/employeeApi';

const ROLE_LABEL: Record<string, string> = {
  STORE_STAFF: '직원',
  STORE_MANAGER: '점장',
  HQ_STAFF: '본사 직원',
  ADMIN: '관리자',
};

/**
 * 점장(또는 관리자) 전용 직원 승인 화면.
 *
 * 본사가 발급해 승인 대기(PENDING) 상태인 직원 목록을 조회하고, 실제 매장 소속 직원인지
 * 확인해 승인하거나 사유를 입력해 거절한다. 승인 전까지 해당 직원은 로그인할 수 없다.
 */
export default function EmployeeApprovalScreen() {
  const [pending, setPending] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // 승인 확인 모달 대상 (Alert.alert 버튼 콜백은 웹에서 동작하지 않아 모달로 직접 구현)
  const [confirmTarget, setConfirmTarget] = useState<Employee | null>(null);
  // 거절 사유 입력 모달 상태
  const [rejectTarget, setRejectTarget] = useState<Employee | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // 처리 완료 안내 배너 (플랫폼 무관 표시)
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  /** 승인 대기 직원 목록을 서버에서 조회합니다. */
  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await employeeApi.getPending();
      setPending(result);
    } catch {
      setError('승인 대기 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /** 승인 확인 모달을 엽니다. */
  const openApproveModal = (employee: Employee) => {
    setConfirmTarget(employee);
  };

  /** 승인을 확정합니다. */
  const confirmApprove = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    setProcessingId(target.id);
    setError('');
    setSuccessMessage('');
    try {
      await employeeApi.approve(target.id);
      setPending((prev) => prev.filter((e) => e.id !== target.id));
      setSuccessMessage(`✓ '${target.name}'(${target.employeeCode}) 직원을 승인했습니다.`);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? '승인에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  /** 거절 사유 입력 모달을 엽니다. */
  const openRejectModal = (employee: Employee) => {
    setRejectTarget(employee);
    setRejectReason('');
  };

  /** 입력한 사유로 직원 계정을 거절합니다. */
  const confirmReject = async () => {
    if (!rejectTarget) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setError('거절 사유를 입력해주세요.');
      return;
    }
    const target = rejectTarget;
    setProcessingId(target.id);
    setError('');
    setSuccessMessage('');
    setRejectTarget(null);
    try {
      await employeeApi.reject(target.id, trimmed);
      setPending((prev) => prev.filter((e) => e.id !== target.id));
      setSuccessMessage(`✓ '${target.name}'(${target.employeeCode}) 직원을 거절했습니다.`);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? '거절에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={pending.length === 0 ? styles.emptyList : styles.list}
          ListHeaderComponent={
            <View style={styles.headerBox}>
              <Text style={styles.headerTitle}>승인 대기 직원</Text>
              <Text style={styles.headerSub}>
                본사가 발급한 직원이 실제 매장 소속인지 확인 후 승인해주세요. 승인 전까지 로그인할 수 없습니다.
              </Text>
              {successMessage ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>승인 대기 중인 직원이 없습니다.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.employeeCode}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {ROLE_LABEL[item.role] ?? item.role} · {item.storeName}
                  </Text>
                  <Text style={styles.meta}>{item.email}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => openRejectModal(item)}
                  disabled={processingId === item.id}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rejectText}>거절</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => openApproveModal(item)}
                  disabled={processingId === item.id}
                  activeOpacity={0.8}
                >
                  {processingId === item.id ? (
                    <ActivityIndicator color={Colors.surface} />
                  ) : (
                    <Text style={styles.approveText}>승인</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* 승인 확인 모달 */}
      <Modal visible={confirmTarget !== null} transparent animationType="fade" onRequestClose={() => setConfirmTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>직원 승인</Text>
            <Text style={styles.modalSub}>
              {confirmTarget ? `'${confirmTarget.name}'(${confirmTarget.employeeCode})` : ''} 직원을 승인하시겠습니까?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setConfirmTarget(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalApprove]}
                onPress={confirmApprove}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>승인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 거절 사유 입력 모달 */}
      <Modal visible={rejectTarget !== null} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>직원 거절</Text>
            <Text style={styles.modalSub}>
              {rejectTarget ? `'${rejectTarget.name}'(${rejectTarget.employeeCode})` : ''} 거절 사유를 입력해주세요.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예: 해당 매장 소속 직원이 아닙니다."
              placeholderTextColor={Colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setRejectTarget(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={confirmReject}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>거절</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { marginTop: Spacing.xl },
  list: { padding: Spacing.md, paddingBottom: Spacing.xl },
  emptyList: { flexGrow: 1, padding: Spacing.md },
  headerBox: { marginBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 18 },
  errorText: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.sm },
  successBanner: {
    backgroundColor: Colors.success + '1A',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  successText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  codeBadge: {
    minWidth: 78,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warning,
    alignItems: 'center',
  },
  codeText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '700' },
  info: { marginLeft: Spacing.md, flex: 1 },
  name: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  meta: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  rejectButton: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.error },
  rejectText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
  approveButton: { backgroundColor: Colors.primary },
  approveText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  modalButton: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.sm, alignItems: 'center' },
  modalCancel: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  modalConfirm: { backgroundColor: Colors.error },
  modalApprove: { backgroundColor: Colors.primary },
  modalConfirmText: { color: Colors.surface, fontSize: FontSize.md, fontWeight: '600' },
});
