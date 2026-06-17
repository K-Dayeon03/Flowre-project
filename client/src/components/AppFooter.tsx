import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import BrandWordmark from './BrandWordmark';

/** 앱 하단 flowre 저작권 표기입니다. */
export default function AppFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.copy}>© 2025 </Text>
      <BrandWordmark size="footer" />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  copy: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
