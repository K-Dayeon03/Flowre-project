import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!employeeCode || !password) {
      setError('직원 코드와 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(employeeCode, password);
    } catch {
      setError('직원 코드 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 로고 영역 */}
        <View style={styles.logoArea}>
          <Text style={styles.brandName}>FLOWRE</Text>
          <Text style={styles.brandSub}>매장 업무 통합 관리</Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>직원 코드</Text>
            <TextInput
              style={styles.input}
              placeholder="직원 코드를 입력하세요"
              placeholderTextColor={Colors.textMuted}
              value={employeeCode}
              onChangeText={setEmployeeCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력하세요"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2025 Flowre · 신세계까사 JAJU</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.xl * 1.5,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 6,
  },
  brandSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    letterSpacing: 1,
  },
  form: { gap: Spacing.md },
  inputWrapper: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
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
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
