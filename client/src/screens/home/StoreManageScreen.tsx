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
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { Store, storeApi } from '../../api/storeApi';
import PostcodeSearch, { PostcodeResult } from '../../components/PostcodeSearch';

export default function StoreManageScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeCode, setStoreCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [postcodeVisible, setPostcodeVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
  };

  /** 입력한 점별 코드·매장명·주소로 신규 매장을 등록합니다. */
  const handleCreate = async () => {
    if (!/^\d{4}$/.test(storeCode) || !storeName.trim()) {
      setError('점별 코드 4자리와 매장명을 입력해주세요.');
      return;
    }
    if (!postalCode || !roadAddress) {
      setError('주소 검색으로 매장 주소를 선택해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await storeApi.create({
        storeCode,
        storeName: storeName.trim(),
        postalCode,
        roadAddress,
        jibunAddress: jibunAddress || undefined,
        detailAddress: detailAddress.trim() || undefined,
      });
      setStores((prev) => [...prev, created].sort((a, b) => a.storeCode.localeCompare(b.storeCode)));
      setStoreCode('');
      setStoreName('');
      setPostalCode('');
      setRoadAddress('');
      setJibunAddress('');
      setDetailAddress('');
    } catch (e: any) {
      const message = e?.response?.data?.error?.message;
      setError(message ?? '매장을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="점별 코드"
            placeholderTextColor={Colors.textMuted}
            value={storeCode}
            onChangeText={setStoreCode}
            keyboardType="number-pad"
            maxLength={4}
          />
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
              {postalCode ? `(${postalCode}) ${roadAddress}` : '주소 검색'}
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
            style={[styles.createButton, saving && styles.disabledButton]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.createButtonText}>등록</Text>
            )}
          </TouchableOpacity>
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
                  {item.roadAddress ? (
                    <Text style={styles.storeAddress} numberOfLines={2}>
                      {item.roadAddress}
                      {item.detailAddress ? ` ${item.detailAddress}` : ''}
                    </Text>
                  ) : null}
                  <Text style={styles.storeMeta}>{item.active ? '운영 중' : '비활성'}</Text>
                </View>
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
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  addressButtonText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  addressSearchIcon: { fontSize: FontSize.md, marginLeft: Spacing.sm },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  createButtonText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  loader: { marginTop: Spacing.xl },
  list: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
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
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  storeInfo: { marginLeft: Spacing.md, flex: 1 },
  storeName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  storeAddress: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  storeMeta: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
