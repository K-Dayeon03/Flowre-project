import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { AssignableRole, Employee, employeeApi } from '../../api/employeeApi';

const EMPLOYEE_CODE_REGEX = /^\d{4}[A-Za-z]{4}[!@#$%^&*?]$/;

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: 'STORE_STAFF', label: '직원' },
  { value: 'STORE_MANAGER', label: '점장' },
  { value: 'HQ_STAFF', label: '본사 직원' },
];

const ROLE_LABEL: Record<string, string> = {
  STORE_STAFF: '직원',
  STORE_MANAGER: '점장',
  HQ_STAFF: '본사 직원',
  ADMIN: '관리자',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  ACTIVE: '활성',
  REJECTED: '거절됨',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  ACTIVE: Colors.success,
  REJECTED: Colors.error,
};

/**
 * 본사(HQ/ADMIN) 전용 직원 계정 발급 화면.
 *
 * 점별 코드·직원 아이디·초기 비밀번호·권한을 입력해 계정을 발급하면, 해당 직원은
 * 발급받은 정보로 곧바로 로그인할 수 있다. 직원 아이디는 점별 코드로 시작해야 한다.
 */
export default function EmployeeManageScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AssignableRole>('STORE_STAFF');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  /** 같은 브랜드의 직원 계정 목록을 서버에서 조회합니다. */
  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await employeeApi.getList();
      setEmployees(result);
    } catch {
      setError('직원 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /** 입력값을 검증하고 신규 직원 계정을 발급합니다. */
  const handleCreate = async () => {
    const trimmedCode = employeeCode.trim();
    if (!name.trim() || !email.trim()) {
      setError('이름과 이메일을 입력해주세요.');
      return;
    }
    if (!/^\d{4}$/.test(storeCode)) {
      setError('점별 코드 4자리를 입력해주세요.');
      return;
    }
    if (!EMPLOYEE_CODE_REGEX.test(trimmedCode)) {
      setError('직원 아이디는 숫자 4자리 + 영문 4글자 + 특수문자 1개 형식이어야 합니다.');
      return;
    }
    if (!trimmedCode.startsWith(storeCode)) {
      setError('직원 아이디는 점별 코드로 시작해야 합니다.');
      return;
    }
    if (password.length < 8) {
      setError('초기 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await employeeApi.create({
        name: name.trim(),
        email: email.trim(),
        storeCode,
        employeeCode: trimmedCode,
        password,
        role,
      });
      setEmployees((prev) =>
        [...prev, created].sort((a, b) => a.employeeCode.localeCompare(b.employeeCode))
      );
      setName('');
      setEmail('');
      setStoreCode('');
      setEmployeeCode('');
      setPassword('');
      setRole('STORE_STAFF');
    } catch (e: any) {
      const message = e?.response?.data?.error?.message;
      setError(message ?? '직원 계정을 발급하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>신규 직원 발급</Text>
      <TextInput
        style={styles.input}
        placeholder="이름"
        placeholderTextColor={Colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={Colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="점별 코드 (예: 1001)"
        placeholderTextColor={Colors.textMuted}
        value={storeCode}
        onChangeText={setStoreCode}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TextInput
        style={styles.input}
        placeholder="직원 아이디 (예: 1001ABCD!)"
        placeholderTextColor={Colors.textMuted}
        value={employeeCode}
        onChangeText={setEmployeeCode}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={9}
      />
      <TextInput
        style={styles.input}
        placeholder="초기 비밀번호 (8자 이상)"
        placeholderTextColor={Colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <View style={styles.roleRow}>
        {ROLE_OPTIONS.map((option) => {
          const selected = role === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.roleButton, selected && styles.roleButtonSelected]}
              onPress={() => setRole(option.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleButtonText, selected && styles.roleButtonTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.createButton, saving && styles.disabledButton]}
        onPress={handleCreate}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={Colors.surface} />
        ) : (
          <Text style={styles.createButtonText}>계정 발급</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.hintText}>
        직원을 등록하려면 해당 매장에 점장이 먼저 등록되어 있어야 합니다. 점장 등록 후 직원을 등록하면,
        그 점장에게 승인 요청이 전달되고 승인 전까지 직원은 로그인할 수 없습니다.
      </Text>

      <Text style={styles.listHeading}>등록된 직원</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={renderForm()}
          ListEmptyComponent={<Text style={styles.emptyText}>등록된 직원이 없습니다.</Text>}
          renderItem={({ item }) => (
            <View style={styles.employeeRow}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{item.employeeCode}</Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{item.name}</Text>
                <Text style={styles.employeeMeta}>
                  {ROLE_LABEL[item.role] ?? item.role} · {item.storeName}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? Colors.textMuted) + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? Colors.textSecondary }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: Spacing.xl },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  formTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  roleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: Colors.primary,
  },
  roleButtonText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  roleButtonTextSelected: { color: Colors.primary, fontWeight: '700' },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  disabledButton: { opacity: 0.6 },
  createButtonText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  hintText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  listHeading: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  loader: { marginTop: Spacing.xl },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
    marginBottom: Spacing.sm,
  },
  codeBadge: {
    minWidth: 78,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  codeText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  employeeInfo: { marginLeft: Spacing.md, flex: 1 },
  employeeName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  employeeMeta: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
