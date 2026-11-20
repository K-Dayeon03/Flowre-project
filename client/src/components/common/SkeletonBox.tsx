import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Colors, Radius } from '../../constants';

interface SkeletonBoxProps {
  /** 스켈레톤 너비입니다. */
  width: DimensionValue;
  /** 스켈레톤 높이입니다. */
  height: number;
  /** 모서리 둥글기입니다. */
  borderRadius?: number;
  /** 외부 스타일입니다. */
  style?: StyleProp<ViewStyle>;
}

/** 로딩 중 레이아웃을 유지하는 opacity pulse 스켈레톤 박스입니다. */
export default function SkeletonBox({ width, height, borderRadius = Radius.md, style }: SkeletonBoxProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.box, { width, height, borderRadius }, animatedStyle, style]} />;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.gray200,
  },
});
