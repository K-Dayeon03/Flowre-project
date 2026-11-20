import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { Store, storeApi } from '../../api/storeApi';
import PostcodeSearch, { PostcodeResult } from '../../components/PostcodeSearch';

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

export default function StoreManageScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeName, setStoreName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [postcodeVisible, setPostcodeVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  /** 등록된 점별 매장 목록을 서버에서 조회합니다. */
  const fetchStores = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await storeApi.getList();
      setStores(result);
    } catch {
      setError('매장 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /** 다음 우편번호 서비스에서 선택한 주소를 폼에 반영합니다. */
  const handleAddressSelected = (result: PostcodeResult) => {
    setPostalCode(result.postalCode);
    setRoadAddress(result.roadAddress);
    setJibunAddress(result.jibunAddress);
    if (result.latitude != null && result.longitude != null) {
      setCoordinates({ latitude: result.latitude, longitude: result.longitude });
    }
  };

  /** 현재 위치 좌표를 매장 위치로 등록합니다. */
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const current = await getCurrentCoordinates();
      if (!current) {
        setError('현재 위치를 가져오지 못했습니다. 위치 권한을 확인해주세요.');
        return;
      }
      setCoordinates(current);
    } finally {
      setLocating(false);
    }
  };

  /** 입력한 매장명·주소로 신규 매장을 등록합니다. 점별 코드는 서버에서 자동 발급합니다. */
  const handleSave = async () => {
    if (!storeName.trim()) {
      setError('매장명을 입력해주세요.');
      return;
    }
    if (!editingStore && (!postalCode || !roadAddress)) {
      setError('주소 검색으로 매장 주소를 선택해주세요.');
      return;
    }
    if (editingStore && ((postalCode && !roadAddress) || (!postalCode && roadAddress))) {
      setError('주소를 정리하려면 우편번호와 도로명 주소가 함께 필요합니다.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingStore) {
        const updated = await storeApi.updateMaster(editingStore.id, {
          storeName: storeName.trim(),
          postalCode: postalCode || undefined,
          roadAddress: roadAddress || undefined,
          jibunAddress: jibunAddress || undefined,
          detailAddress: detailAddress.trim() || undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        });
        setStores((prev) => prev.map((store) => (store.id === updated.id ? updated : store)));
      } else {
        const created = await storeApi.create({
          storeName: storeName.trim(),
          postalCode,
          roadAddress,
          jibunAddress: jibunAddress || undefined,
          detailAddress: detailAddress.trim() || undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        });
        setStores((prev) => [...prev, created].sort((a, b) => a.storeCode.localeCompare(b.storeCode)));
      }
      resetForm();
    } catch (e: any) {
      const message = e?.response?.data?.error?.message;
      setError(message ?? (editingStore ? '매장 정보를 수정하지 못했습니다.' : '매장을 등록하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  /** 매장 행을 폼에 불러와 마스터 정리 모드로 전환합니다. */
  const startEdit = (store: Store) => {
    setEditingStore(store);
    setStoreName(store.storeName);
    setPostalCode(store.postalCode ?? '');
    setRoadAddress(store.roadAddress ?? '');
    setJibunAddress(store.jibunAddress ?? '');
    setDetailAddress(store.detailAddress ?? '');
    setCoordinates(
      store.latitude != null && store.longitude != null
        ? { latitude: store.latitude, longitude: store.longitude }
        : null
    );
    setError('');
  };

  /** 등록/정리 폼을 초기 상태로 되돌립니다. */
  const resetForm = () => {
    setEditingStore(null);
    setStoreName('');
    setPostalCode('');
    setRoadAddress('');
    setJibunAddress('');
    setDetailAddress('');
    setCoordinates(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.form}>
          <View style={styles.autoCodeBox}>
            <Text style={styles.autoCodeTitle}>
              {editingStore ? `${editingStore.storeCode} 매장 마스터 정리` : '점별 코드는 자동 발급됩니다'}
            </Text>
            <Text style={styles.autoCodeDescription}>
              {editingStore
                ? '재고 업로드로 자동 생성된 매장은 매장명과 주소를 여기서 보완합니다.'
                : '등록 시 서버가 중복되지 않는 숫자 4자리 코드를 생성합니다.'}
            </Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="매장명"
            placeholderTextColor={Colors.textMuted}
            value={storeName}
            onChangeText={setStoreName}
          />

          {/* 주소 검색 */}
          <TouchableOpacity
            style={styles.addressButton}
            onPress={() => setPostcodeVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addressButtonText}>
              {postalCode ? `(${postalCode}) ${roadAddress}` : '카카오 주소 검색'}
            </Text>
            <Text style={styles.addressSearchIcon}>🔍</Text>
          </TouchableOpacity>
          {roadAddress ? (
            <TextInput
              style={styles.input}
              placeholder="상세 주소 (동·층·호 등)"
              placeholderTextColor={Colors.textMuted}
              value={detailAddress}
              onChangeText={setDetailAddress}
            />
          ) : null}

          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={locating}
            activeOpacity={0.82}
          >
            <Text style={styles.locationButtonText}>
              {locating ? '현재 위치 확인 중...' : coordinates ? '현재 위치 다시 등록' : '내 위치로 매장 위치 등록'}
            </Text>
          </TouchableOpacity>
          {coordinates ? (
            <Text style={styles.locationMeta}>
              위도 {coordinates.latitude.toFixed(5)} · 경도 {coordinates.longitude.toFixed(5)}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.createButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>{editingStore ? '수정 저장' : '등록'}</Text>
            )}
          </TouchableOpacity>
          {editingStore ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
              disabled={saving}
              activeOpacity={0.82}
            >
              <Text style={styles.cancelButtonText}>정리 취소</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={stores.length === 0 ? styles.emptyList : styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>등록된 매장이 없습니다.</Text>}
            renderItem={({ item }) => (
              <View style={styles.storeRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.storeCode}</Text>
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{item.storeName}</Text>
                  {item.needsReview ? (
                    <Text style={styles.reviewBadge}>정리 필요</Text>
                  ) : null}
                  {item.roadAddress ? (
                    <Text style={styles.storeAddress} numberOfLines={2}>
                      {item.roadAddress}
                      {item.detailAddress ? ` ${item.detailAddress}` : ''}
                    </Text>
                  ) : null}
                  <Text style={styles.storeMeta}>{item.active ? '운영 중' : '비활성'}</Text>
                  {item.latitude != null && item.longitude != null ? (
                    <Text style={styles.storeMeta}>위치 등록됨</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => startEdit(item)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.editButtonText}>{item.needsReview ? '정리' : '수정'}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <PostcodeSearch
        visible={postcodeVisible}
        onClose={() => setPostcodeVisible(false)}
        onSelected={handleAddressSelected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.md },
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
  autoCodeBox: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  autoCodeTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  autoCodeDescription: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  addressButtonText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  addressSearchIcon: { fontSize: FontSize.md, marginLeft: Spacing.sm },
  locationButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  locationMeta: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  loader: { marginTop: Spacing.xl },
  list: { paddingTop: 0, paddingBottom: Spacing.xl, gap: Spacing.sm },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  codeBadge: {
    minWidth: 58,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  codeText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  storeInfo: { marginLeft: Spacing.md, flex: 1 },
  storeName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  storeAddress: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  storeMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  reviewBadge: {
    alignSelf: 'flex-start',
    color: Colors.warning,
    backgroundColor: Colors.warning + '18',
    borderWidth: 1,
    borderColor: Colors.warning + '35',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    fontSize: FontSize.xs,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  editButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
});
