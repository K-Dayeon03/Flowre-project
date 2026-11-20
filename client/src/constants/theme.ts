import { Colors } from './colors';
import { Radius, Shadows, Spacing } from './spacing';
import { Typography } from './typography';

/** 기존 화면 import를 유지하기 위한 디자인 토큰 호환 레이어입니다. */
export { Colors, Radius, Spacing };

export const FontSize = {
  xs: Typography.size.xs,
  sm: Typography.size.sm,
  md: Typography.size.base,
  lg: Typography.size.lg,
  xl: Typography.size.xl,
  xxl: Typography.size['2xl'],
  hero: Typography.size['3xl'],
} as const;

export const Gradients = {
  brand: [Colors.primary500, Colors.primary600] as const,
  brandDark: [Colors.gray900, Colors.gray800] as const,
  soft: [Colors.white, Colors.gray50] as const,
  success: [Colors.success, Colors.success700] as const,
};

export const Shadow = Shadows;
