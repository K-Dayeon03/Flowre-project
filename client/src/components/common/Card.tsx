import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../constants';

interface CardProps {
  /** 카드 내부 콘텐츠입니다. */
  children: ReactNode;
  /** 카드 내부 여백입니다. */
  padding?: number;
  /** 값이 있으면 터치 가능한 카드로 렌더링합니다. */
  onPress?: () => void;
  /** 외부 카드 스타일입니다. */
  style?: StyleProp<ViewStyle>;
}

/** surface 배경과 표준 그림자를 가진 공통 카드입니다. */
export default function Card({ children, padding = Spacing.lg, onPress, style }: CardProps) {
  const content = <View style={[styles.card, { padding }, style]}>{children}</View>;

  if (!onPress) {
    return content;
  }

  return (
    <Pressable android_ripple={{ color: Colors.gray100 }} onPress={onPress} style={styles.pressable}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Radius.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadows.card,
  },
});
