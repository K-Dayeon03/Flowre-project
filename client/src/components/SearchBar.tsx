import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

interface SearchBarProps {
  /** 현재 검색어 */
  value: string;
  /** 텍스트 변경 콜백 */
  onChangeText: (text: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 외부에서 주입할 컨테이너 스타일 */
  style?: StyleProp<ViewStyle>;
}

/**
 * 검색 아이콘과 지우기 버튼이 포함된 검색 입력 컴포넌트입니다.
 * value가 있을 때만 지우기(×) 버튼이 표시됩니다.
 */
export default function SearchBar({ value, onChangeText, placeholder = '검색', style }: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearBtn}>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  icon: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  clearBtn: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    lineHeight: FontSize.lg + 2,
  },
});
