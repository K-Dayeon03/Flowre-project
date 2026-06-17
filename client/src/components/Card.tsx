import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** 표준 surface 카드 컨테이너입니다. */
export default function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
});
