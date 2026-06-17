import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Gradients, Radius } from '../constants/theme';

interface AvatarProps {
  name?: string;
  size?: number;
}

/** 이름 이니셜을 그라데이션 원형으로 표시합니다. */
export default function Avatar({ name, size = 42 }: AvatarProps) {
  const initial = name?.trim()?.[0] ?? '?';
  return (
    <LinearGradient colors={Gradients.brand} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size >= 48 ? FontSize.lg : FontSize.md }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${Colors.surface}66`,
  },
  text: {
    color: Colors.surface,
    fontWeight: '900',
  },
});
