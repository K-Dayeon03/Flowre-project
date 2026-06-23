import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import {
  AssignableRole,
  Employee,
  EmployeeCodeRotateResult,
  employeeApi,
} from '../../api/employeeApi';
import { useAuthStore } from '../../store/useAuthStore';

// ── 상수 ────────────────────────────────────────────────────────────
const EMPLOYEE_CODE_REGEX = /^\d{4}[A-Za-z]{4}[!@#$%^&*?]$/;

const ROLE_OPTIONS: { value: AssignableRole; label: string; desc: string }[] = [
  { value: 'STORE_STAFF', label: '직원', desc: '매장 일반 직원' },
  { value: 'STORE_MANAGER', label: '점장', desc: '매장 관리 책임자' },
  { value: 'HQ_STAFF', label: '본사', desc: '본사 소속 직원' },
];

const ROLE_LABEL: Record<string, string> = {
  STORE_STAFF: '직원',
  STORE_MANAGER: '점장',
  HQ_STAFF: '본사',
  ADMIN: '관리자',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  ACTIVE: '활성',
  REJECTED: '비활성',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  ACTIVE: Colors.success,
  REJECTED: Colors.error,
};

type ModalMode = 'create' | 'edit' | 'password' | 'rotateResult' | null;

/** 마지막 로테이션 또는 생성 이후 경과 일수를 계산합니다. */
function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** D-day 스타일 로테이션 잔여일을 반환합니다. */
function rotationStatus(emp: Employee, rotationDays: number) {
  if (emp.role === 'ADMIN') return null;
  const since = daysSince(emp.codeRotatedAt ?? emp.createdAt);
  if (since === null) return null;
  const remaining = rotationDays - since;
  return remaining;
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function EmployeeManageScreen() {
  const me = useAuthStore((s) => s.user);
  const ROTATION_DAYS = 90;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 모달 상태
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [rotateResult, setRotateResult] = useState<EmployeeCodeRotateResult | null>(null);

  // 신규 발급 폼
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createStoreCode, setCreateStoreCode] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<AssignableRole>('STORE_STAFF');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // 수정 폼
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<AssignableRole>('STORE_STAFF');

  // 비밀번호 초기화 폼
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.storeName.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  async function load() {
    setLoading(true);
    try {
      const list = await employeeApi.getList();
      setEmployees(list);
    } catch {
      Alert.alert('오류', '직원 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setModalMode(null);
    setSelectedEmployee(null);
    setFormError('');
    setNewPassword('');
    setConfirmPassword('');
    setRotateResult(null);
    Keyboard.dismiss();
  }

  // ── Create ──────────────────────────────────────────────────────
  async function handleCreate() {
    const code = createCode.trim();
    if (!createName.trim() || !createEmail.trim()) { setFormError('이름과 이메일을 입력해주세요.'); return; }
    if (!/^\d{4}$/.test(createStoreCode)) { setFormError('점별 코드 4자리를 입력해주세요.'); return; }
    if (!EMPLOYEE_CODE_REGEX.test(code)) { setFormError('직원 아이디: 점별 코드 4자리 + 영문 4자리 + 특수문자 1개'); return; }
    if (!code.startsWith(createStoreCode)) { setFormError('직원 아이디는 점별 코드로 시작해야 합니다.'); return; }
    if (createPassword.length < 8) { setFormError('비밀번호는 8자 이상이어야 합니다.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const created = await employeeApi.create({
        name: createName.trim(), email: createEmail.trim(),
        storeCode: createStoreCode, employeeCode: code,
        password: createPassword, role: createRole,
      });
      setEmployees((prev) => [created, ...prev]);
      setCreateName(''); setCreateEmail(''); setCreateStoreCode('');
      setCreateCode(''); setCreatePassword(''); setCreateRole('STORE_STAFF');
      closeModal();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message ?? '계정 발급에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // ── Update ──────────────────────────────────────────────────────
  function openEdit(emp: Employee) {
    setSelectedEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditRole((emp.role === 'ADMIN' ? 'HQ_STAFF' : emp.role) as AssignableRole);
    setModalMode('edit');
  }

  async function handleUpdate() {
    if (!selectedEmployee) return;
    if (!editName.trim() || !editEmail.trim()) { setFormError('이름과 이메일을 입력해주세요.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const updated = await employeeApi.update(selectedEmployee.id, {
        name: editName.trim(), email: editEmail.trim(), role: editRole,
      });
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      closeModal();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message ?? '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────
  function handleDelete(emp: Employee) {
    Alert.alert(
      '계정 비활성화',
      `"${emp.name}" (${emp.employeeCode}) 계정을 비활성화할까요?\n비활성화된 계정은 로그인할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '비활성화',
          style: 'destructive',
          onPress: async () => {
            try {
              await employeeApi.delete(emp.id);
              setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
            } catch (e: any) {
              Alert.alert('실패', e?.response?.data?.error?.message ?? '비활성화에 실패했습니다.');
            }
          },
        },
      ]
    );
  }

  // ── Password Reset ──────────────────────────────────────────────
  function openPasswordReset(emp: Employee) {
    setSelectedEmployee(emp);
    setNewPassword('');
    setConfirmPassword('');
    setModalMode('password');
  }

  async function handlePasswordReset() {
    if (!selectedEmployee) return;
    if (newPassword.length < 8) { setFormError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (newPassword !== confirmPassword) { setFormError('비밀번호가 일치하지 않습니다.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await employeeApi.resetPassword(selectedEmployee.id, newPassword);
      Alert.alert('완료', `${selectedEmployee.name}의 비밀번호가 초기화되었습니다.`);
      closeModal();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message ?? '비밀번호 초기화에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  // ── Code Rotate ──────────────────────────────────────────────────
  function handleRotate(emp: Employee) {
    Alert.alert(
      '코드 로테이션',
      `"${emp.name}" (${emp.employeeCode})의 직원 코드를 즉시 변경할까요?\n기존 코드로는 로그인할 수 없게 됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: async () => {
            try {
              const result = await employeeApi.rotateCode(emp.id);
              setRotateResult(result);
              setSelectedEmployee(emp);
              setEmployees((prev) =>
                prev.map((e) =>
                  e.id === emp.id ? { ...e, employeeCode: result.newEmployeeCode, codeRotatedAt: result.rotatedAt } : e
                )
              );
              setModalMode('rotateResult');
            } catch (e: any) {
              Alert.alert('실패', e?.response?.data?.error?.message ?? '코드 로테이션에 실패했습니다.');
            }
          },
        },
      ]
    );
  }

  // ── 카드 렌더 ────────────────────────────────────────────────────
  function renderCard({ item: emp }: { item: Employee }) {
    const remaining = rotationStatus(emp, ROTATION_DAYS);
    const isExpired = remaining !== null && remaining <= 0;
    const isWarning = remaining !== null && remaining > 0 && remaining <= 14;
    const isAdmin = emp.role === 'ADMIN';

    return (
      <View style={[styles.card, isAdmin && styles.cardAdmin]}>
        {/* 상단: 이름 + 상태 뱃지 */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.empName}>{emp.name}</Text>
            <Text style={styles.empEmail}>{emp.email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[emp.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[emp.status] }]}>
              {STATUS_LABEL[emp.status] ?? emp.status}
            </Text>
          </View>
        </View>

        {/* 코드 + 역할 */}
        <View style={styles.codeRow}>
          <View style={styles.codePill}>
            <Text style={styles.codePillText}>{emp.employeeCode}</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{ROLE_LABEL[emp.role] ?? emp.role}</Text>
          </View>
          <Text style={styles.storeName}>{emp.storeName}</Text>
        </View>

        {/* 로테이션 상태 (ADMIN 제외) */}
        {!isAdmin && remaining !== null ? (
          <View style={[styles.rotationBar, isExpired && styles.rotationBarExpired, isWarning && styles.rotationBarWarning]}>
            <Text style={[styles.rotationText, isExpired && styles.rotationTextExpired, isWarning && styles.rotationTextWarning]}>
              {isExpired
                ? '코드 만료 — 로테이션 필요'
                : `코드 만료까지 D-${remaining}`}
            </Text>
          </View>
        ) : null}

        {/* 액션 버튼 (ADMIN은 편집 불가) */}
        {!isAdmin ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(emp)}>
              <Text style={styles.actionBtnText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openPasswordReset(emp)}>
              <Text style={styles.actionBtnText}>비밀번호 초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, (isExpired || isWarning) && styles.actionBtnHighlight]}
              onPress={() => handleRotate(emp)}
            >
              <Text style={[styles.actionBtnText, (isExpired || isWarning) && styles.actionBtnHighlightText]}>
                코드 로테이션
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(emp)}>
              <Text style={styles.deleteBtnText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.adminNote}>시스템 관리자 계정 — 수정·삭제 불가</Text>
        )}
      </View>
    );
  }

  // ── 렌더 ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>EMPLOYEES</Text>
          <Text style={styles.title}>직원 계정 관리</Text>
        </View>
        <TouchableOpacity
          style={styles.createFab}
          onPress={() => { setFormError(''); setModalMode('create'); }}
        >
          <Text style={styles.createFabText}>+ 신규 발급</Text>
        </TouchableOpacity>
      </View>

      {/* 검색 */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="이름, 코드, 이메일, 매장 검색"
          placeholderTextColor={Colors.textMuted}
          clearButtonMode="while-editing"
        />
      </View>

      {/* 카운트 */}
      <Text style={styles.countLabel}>전체 {filtered.length}명</Text>

      {/* 목록 */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>등록된 직원이 없습니다</Text>
              <Text style={styles.emptyDesc}>+ 신규 발급 버튼으로 계정을 만들어주세요.</Text>
            </View>
          ) : null
        }
      />

      {/* ── 신규 발급 모달 ── */}
      <Modal transparent visible={modalMode === 'create'} animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>신규 직원 계정 발급</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>이름 *</Text>
              <TextInput style={styles.input} value={createName} onChangeText={setCreateName} placeholder="홍길동" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.fieldLabel}>이메일 *</Text>
              <TextInput style={styles.input} value={createEmail} onChangeText={setCreateEmail} placeholder="hong@flowre.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.fieldLabel}>점별 코드 *</Text>
              <TextInput style={styles.input} value={createStoreCode} onChangeText={setCreateStoreCode} placeholder="1001" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={4} />

              <Text style={styles.fieldLabel}>직원 아이디 * (점별코드 + 영문4 + 특수문자1)</Text>
              <TextInput style={styles.input} value={createCode} onChangeText={setCreateCode} placeholder="1001ABCD!" placeholderTextColor={Colors.textMuted} autoCapitalize="none" maxLength={9} />

              <Text style={styles.fieldLabel}>초기 비밀번호 * (8자 이상)</Text>
              <TextInput style={styles.input} value={createPassword} onChangeText={setCreatePassword} placeholder="••••••••" placeholderTextColor={Colors.textMuted} secureTextEntry autoCapitalize="none" />

              <Text style={styles.fieldLabel}>권한 *</Text>
              <View style={styles.roleRow}>
                {ROLE_OPTIONS.map((opt) => {
                  const active = createRole === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                      onPress={() => setCreateRole(opt.value)}
                    >
                      <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{opt.label}</Text>
                      <Text style={[styles.roleChipDesc, active && styles.roleChipDescActive]}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>발급</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 수정 모달 ── */}
      <Modal transparent visible={modalMode === 'edit'} animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>직원 정보 수정</Text>
            <Text style={styles.sheetSubtitle}>{selectedEmployee?.employeeCode}</Text>

            <Text style={styles.fieldLabel}>이름 *</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor={Colors.textMuted} />

            <Text style={styles.fieldLabel}>이메일 *</Text>
            <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.fieldLabel}>권한</Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((opt) => {
                const active = editRole === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                    onPress={() => setEditRole(opt.value)}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 비밀번호 초기화 모달 ── */}
      <Modal transparent visible={modalMode === 'password'} animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>비밀번호 초기화</Text>
            <Text style={styles.sheetSubtitle}>{selectedEmployee?.name} ({selectedEmployee?.employeeCode})</Text>

            <Text style={styles.fieldLabel}>새 비밀번호 * (8자 이상)</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" placeholder="새 비밀번호" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.fieldLabel}>새 비밀번호 확인 *</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" placeholder="새 비밀번호 재입력" placeholderTextColor={Colors.textMuted} />

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handlePasswordReset} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>초기화</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 코드 로테이션 결과 모달 ── */}
      <Modal transparent visible={modalMode === 'rotateResult'} animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.resultPanel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.resultIcon}>🔄</Text>
            <Text style={styles.resultTitle}>코드 로테이션 완료</Text>
            <Text style={styles.resultName}>{selectedEmployee?.name}</Text>
            <View style={styles.resultCodeBox}>
              <Text style={styles.resultCodeLabel}>새 직원 아이디</Text>
              <Text style={styles.resultCode}>{rotateResult?.newEmployeeCode}</Text>
            </View>
            <Text style={styles.resultMeta}>
              다음 예정일: {rotateResult?.nextRotationAt
                ? new Date(rotateResult.nextRotationAt).toLocaleDateString('ko-KR')
                : '-'}
            </Text>
            <Text style={styles.resultHint}>이 코드를 직원에게 반드시 안내해주세요.</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={closeModal}>
              <Text style={styles.submitBtnText}>확인</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  kicker: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary, marginTop: 2 },
  createFab: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  createFabText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },

  searchWrap: { paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  countLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 96, gap: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardAdmin: { borderColor: Colors.accent + '55', backgroundColor: Colors.accent + '08' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitleBlock: { flex: 1, gap: 2 },
  empName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  empEmail: { fontSize: FontSize.sm, color: Colors.textMuted },

  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },

  codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  codePill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  codePillText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700', fontFamily: 'monospace' },
  rolePill: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rolePillText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  storeName: { color: Colors.textMuted, fontSize: FontSize.xs },

  rotationBar: {
    backgroundColor: Colors.success + '14',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.success + '33',
  },
  rotationBarExpired: { backgroundColor: Colors.error + '14', borderColor: Colors.error + '44' },
  rotationBarWarning: { backgroundColor: Colors.warning + '14', borderColor: Colors.warning + '44' },
  rotationText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  rotationTextExpired: { color: Colors.error },
  rotationTextWarning: { color: Colors.warning },

  actionRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  actionBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceMuted,
  },
  actionBtnText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  actionBtnHighlight: { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '66' },
  actionBtnHighlightText: { color: Colors.warning },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.error + '55',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.error + '10',
  },
  deleteBtnText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: '600' },
  adminNote: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  // 모달 공통
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    maxHeight: '90%',
    ...Shadow.raised,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  sheetSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: -Spacing.xs },

  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },

  roleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    gap: 2,
  },
  roleChipActive: { backgroundColor: Colors.primary + '12', borderColor: Colors.primary },
  roleChipText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  roleChipTextActive: { color: Colors.primary },
  roleChipDesc: { fontSize: FontSize.xs, color: Colors.textMuted },
  roleChipDescActive: { color: Colors.primary + 'AA' },

  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },

  sheetActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  // 로테이션 결과 패널
  resultPanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    margin: Spacing.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.raised,
  },
  resultIcon: { fontSize: 40 },
  resultTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  resultName: { fontSize: FontSize.sm, color: Colors.textSecondary },
  resultCodeBox: {
    backgroundColor: Colors.primary + '10',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    width: '100%',
  },
  resultCodeLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  resultCode: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary, fontFamily: 'monospace' },
  resultMeta: { fontSize: FontSize.sm, color: Colors.textMuted },
  resultHint: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
});
