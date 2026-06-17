import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize } from '../constants/theme';

type WordmarkSize = 'hero' | 'header' | 'footer';

interface BrandWordmarkProps {
  size?: WordmarkSize;
  light?: boolean;
}

const SIZE_STYLE: Record<WordmarkSize, { fontSize: number; underlineWidth: number; underlineHeight: number }> = {
  hero: { fontSize: 48, underlineWidth: 34, underlineHeight: 5 },
  header: { fontSize: 25, underlineWidth: 20, underlineHeight: 4 },
  footer: { fontSize: FontSize.sm, underlineWidth: 12, underlineHeight: 2 },
};

/** 소문자 flowre 워드마크와 시안 흐름선을 렌더링합니다. */
export default function BrandWordmark({ size = 'header', light = false }: BrandWordmarkProps) {
  const token = SIZE_STYLE[size];
  return (
    <View style={styles.wrap}>
      <Text style={[styles.word, { fontSize: token.fontSize, color: light ? Colors.surface : Colors.textPrimary }]}>
        flowre
      </Text>
      <View
        style={[
          styles.flowLine,
          {
            width: token.underlineWidth,
            height: token.underlineHeight,
            borderRadius: token.underlineHeight,
            right: size === 'hero' ? 12 : 3,
            bottom: size === 'footer' ? -1 : 1,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  word: {
    fontWeight: '900',
    letterSpacing: 0,
  },
  flowLine: {
    position: 'absolute',
    backgroundColor: Colors.accent,
  },
});
