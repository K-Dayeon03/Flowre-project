import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { extractStoreCode, getLoginRequiredError } from './loginValidation';
import AppFooter from '../../components/AppFooter';
import BrandWordmark from '../../components/BrandWordmark';

const LoginColors = {
  page: '#F0F4FF',
  surface: '#FFFFFF',
  surfaceStrong: '#FFFFFF',
  surfaceSoft: '#F5F8FF',
  ink: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#DBEAFE',
  lineStrong: '#93C5FD',
  gray: '#64748B',
  button: '#1E3A8A',
  buttonPressed: '#1E2F77',
  shadow: 'rgba(30, 58, 138, 0.14)',
};

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useAuthStore((s) => s.login);
  const isWide = width >= 860;

  const handleLogin = async () => {
    const validationError = getLoginRequiredError(employeeCode, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(extractStoreCode(employeeCode), employeeCode, password);
    } catch (e: any) {
      const message = e?.response?.data?.error?.message;
      setError(message ?? '직원 아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.authShell, isWide && styles.authShellWide]}>
            <View style={[styles.heroPanel, isWide && styles.heroPanelWide]}>
              <View style={styles.wordmarkFrame}>
                <BrandWordmark size="hero" />
              </View>
              <Text style={styles.tagline}>일의 흐름을 하나로</Text>
              <Text style={styles.heroCopy}>입점 등록한 브랜드와 매장이 함께 쓰는 Flowre 업무 공간</Text>
            </View>

            <View style={[styles.formCard, isWide && styles.formCardWide]}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formTitle}>직원 로그인</Text>
                  <Text style={styles.formSub}>발급받은 직원 아이디와 비밀번호로 접속하세요.</Text>
                </View>
                <View style={styles.formStatus}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>secure</Text>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>직원 아이디</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 1001ABCD!"
                  placeholderTextColor={LoginColors.faint}
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
                  placeholderTextColor={LoginColors.faint}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                activeOpacity={0.86}
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.loginButtonText}>로그인</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <AppFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LoginColors.page },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  authShell: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  authShellWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroPanel: {
    minHeight: 260,
    justifyContent: 'center',
    backgroundColor: LoginColors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: LoginColors.line,
    padding: Spacing.xl,
    shadowColor: LoginColors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 2,
  },
  heroPanelWide: {
    flex: 1.05,
    minHeight: 520,
  },
  wordmarkFrame: {
    alignSelf: 'flex-start',
    paddingBottom: Spacing.xs,
  },
  heroCopy: {
    maxWidth: 360,
    marginTop: Spacing.md,
    color: LoginColors.muted,
    fontSize: FontSize.md,
    lineHeight: 22,
    fontWeight: '600',
  },
  tagline: {
    marginTop: Spacing.sm,
    color: LoginColors.ink,
    fontSize: FontSize.xl,
    fontWeight: '900',
  },
  formCard: {
    gap: Spacing.md,
    backgroundColor: LoginColors.surfaceStrong,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: LoginColors.line,
    padding: Spacing.lg,
    shadowColor: LoginColors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 2,
  },
  formCardWide: {
    flex: 0.78,
    justifyContent: 'center',
    minWidth: 360,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: LoginColors.ink,
  },
  formSub: {
    marginTop: -Spacing.sm,
    fontSize: FontSize.sm,
    color: LoginColors.muted,
  },
  formStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: LoginColors.surfaceSoft,
    borderWidth: 1,
    borderColor: LoginColors.line,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: LoginColors.button,
  },
  statusText: {
    color: LoginColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  inputWrapper: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.xs,
    color: LoginColors.muted,
    fontWeight: '800',
  },
  input: {
    backgroundColor: LoginColors.surfaceSoft,
    borderWidth: 1,
    borderColor: LoginColors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: LoginColors.ink,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    textAlign: 'center',
  },
  loginButton: {
    minHeight: 52,
    marginTop: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: LoginColors.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LoginColors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 2,
  },
  loginButtonDisabled: {
    backgroundColor: LoginColors.buttonPressed,
    opacity: 0.68,
  },
  loginButtonText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
});
