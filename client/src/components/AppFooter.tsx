import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import BrandWordmark from './BrandWordmark';

/** 앱 하단 flowre 저작권 표기입니다. */
export default function AppFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.brandBlock}>
        <BrandWordmark size="footer" />
        <Text style={styles.caption}>입점 브랜드 매장 업무관리 플랫폼</Text>
      </View>
      <Text style={styles.copy}>© 2026 Flowre</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(188, 196, 203, 0.48)',
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
  },
  brandBlock: {
    gap: 2,
    minWidth: 180,
  },
  caption: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  copy: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '800',
  },
});
