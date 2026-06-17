import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Colors, FontSize, Gradients, Radius, Shadow, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { getLoginRequiredError } from './loginValidation';
import BrandWordmark from '../../components/BrandWordmark';
import GradientButton from '../../components/GradientButton';
import AppFooter from '../../components/AppFooter';
import Card from '../../components/Card';
import { NearbyStore, storeApi } from '../../api/storeApi';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/** 웹과 네이티브에서 현재 위치 좌표를 얻습니다. 실패 시 null을 반환합니다. */
async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    if (Platform.OS === 'web') {
      const geolocation = (globalThis.navigator as any)?.geolocation;
      if (!geolocation) return null;
      return await new Promise<Coordinates | null>((resolve) => {
        geolocation.getCurrentPosition(
          (position: { coords: Coordinates }) => resolve(position.coords),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
        );
      });
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const [storeCode, setStoreCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [error, setError] = useState('');

  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    const validationError = getLoginRequiredError(storeCode, employeeCode, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(storeCode, employeeCode, password);
    } catch (e: any) {
      // 서버가 내려준 실제 사유(승인 대기·거절 등)를 우선 노출하고, 없으면 일반 메시지로 폴백한다.
      const message = e?.response?.data?.error?.message;
      setError(message ?? '점별 코드, 직원 아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindStore = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      if (!coords) return;
      const stores = await storeApi.getNearbyStores(coords.latitude, coords.longitude, 5);
      if (stores.length === 1) {
        setStoreCode(stores[0].storeCode);
        return;
      }
      if (stores.length > 1) {
        setNearbyStores(stores);
        setStoreModalVisible(true);
      }
    } catch {
      // 위치 기반 자동채움 실패는 수동 입력 흐름을 막지 않는다.
    } finally {
      setLocating(false);
    }
  };

  const selectStore = (store: NearbyStore) => {
    setStoreCode(store.storeCode);
    setStoreModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <BrandWordmark size="hero" light />
            <Text style={styles.tagline}>일의 흐름을 하나로</Text>
          </LinearGradient>

          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>직원 로그인</Text>
            <Text style={styles.formSub}>점별 코드와 직원 계정으로 접속하세요.</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>점별 코드</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 1001"
                placeholderTextColor={Colors.textMuted}
                value={storeCode}
                onChangeText={setStoreCode}
                keyboardType="number-pad"
                maxLength={4}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.locationButton} onPress={handleFindStore} disabled={locating} activeOpacity={0.82}>
                <Text style={styles.locationButtonText}>{locating ? '매장 찾는 중...' : '📍 내 위치로 매장 찾기'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>직원 아이디</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 1001ABCD!"
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

            <GradientButton title="로그인" onPress={handleLogin} loading={loading} disabled={loading} style={styles.loginButton} />
          </Card>

          <AppFooter />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={storeModalVisible} transparent animationType="fade" onRequestClose={() => setStoreModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>가까운 매장 선택</Text>
            {nearbyStores.map((store) => (
              <TouchableOpacity key={store.storeCode} style={styles.storeOption} onPress={() => selectStore(store)}>
                <View>
                  <Text style={styles.storeName}>{store.storeName}</Text>
                  <Text style={styles.storeDistance}>{store.storeCode} · 약 {Math.round(store.distanceMeters)}m</Text>
                </View>
                <Text style={styles.storeArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setStoreModalVisible(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.lg,
  },
  hero: {
    minHeight: 250,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: 58,
    justifyContent: 'flex-end',
  },
  tagline: {
    marginTop: Spacing.sm,
    color: `${Colors.surface}E6`,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  formCard: {
    marginHorizontal: Spacing.md,
    marginTop: -42,
    gap: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadow.raised,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  formSub: {
    marginTop: -Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  inputWrapper: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  locationButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: `${Colors.accent}12`,
  },
  locationButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  loginButton: { marginTop: Spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.36)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.raised,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  storeDistance: {
    marginTop: 2,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  storeArrow: {
    fontSize: FontSize.xxl,
    color: Colors.accent,
    fontWeight: '800',
  },
  modalClose: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalCloseText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '800',
  },
});
