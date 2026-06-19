import React, { useState } from 'react';
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
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { AddressSearchResult, storeApi } from '../api/storeApi';

/** 카카오 로컬 API에서 선택한 주소 정보 */
export interface PostcodeResult {
  /** 우편번호 (5자리) */
  postalCode: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 지번 주소 */
  jibunAddress: string;
  /** 위도 */
  latitude?: number;
  /** 경도 */
  longitude?: number;
}

interface PostcodeSearchProps {
  visible: boolean;
  onClose: () => void;
  onSelected: (result: PostcodeResult) => void;
}

/**
 * 매장 주소 입력용 카카오 주소 검색 모달.
 *
 * REST API 키는 서버 환경변수로 보관하고, 클라이언트는 서버의 주소 검색 API만 호출한다.
 */
export default function PostcodeSearch({ visible, onClose, onSelected }: PostcodeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** 입력한 검색어로 카카오 주소 검색을 수행합니다. */
  const handleSearch = async () => {
    if (!query.trim()) {
      setError('검색할 주소를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const searched = await storeApi.searchAddresses(query.trim());
      setResults(searched);
      if (searched.length === 0) {
        setError('검색 결과가 없습니다.');
      }
    } catch (e: any) {
      const message = e?.response?.data?.error?.message ?? e?.response?.data?.message;
      const status = e?.response?.status;
      if (message && message !== '서버 내부 오류가 발생했습니다.') {
        setError(message);
      } else if (status >= 500) {
        setError('카카오 주소 검색 설정을 확인해주세요. REST API 키 또는 서버 네트워크 문제입니다.');
      } else {
        setError('주소를 검색하지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  /** 검색 결과를 선택하고 부모 폼에 주소·좌표를 전달합니다. */
  const handleSelect = (item: AddressSearchResult) => {
    onSelected({
      postalCode: item.postalCode,
      roadAddress: item.roadAddress,
      jibunAddress: item.jibunAddress ?? '',
      latitude: item.latitude,
      longitude: item.longitude,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>주소 검색</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="도로명, 건물명, 지번 주소 검색"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading} activeOpacity={0.82}>
            {loading ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.searchButtonText}>검색</Text>}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.roadAddress}-${item.jibunAddress}-${index}`}
          contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>주소를 검색해 매장 위치를 선택하세요.</Text> : null}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => handleSelect(item)} activeOpacity={0.82}>
              <View style={styles.resultTextBlock}>
                <Text style={styles.roadAddress}>{item.roadAddress || item.jibunAddress}</Text>
                {item.jibunAddress ? <Text style={styles.jibunAddress}>{item.jibunAddress}</Text> : null}
                {item.postalCode ? <Text style={styles.postalCode}>우편번호 {item.postalCode}</Text> : null}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  close: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  searchButton: {
    minWidth: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  searchButtonText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  errorText: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    color: Colors.error,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  resultTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  roadAddress: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  jibunAddress: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  postalCode: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    marginLeft: Spacing.sm,
  },
});
