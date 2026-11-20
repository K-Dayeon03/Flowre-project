import { Platform } from 'react-native';
import { Colors } from './colors';

/** 앱 전역 여백, 라운드, 터치 크기, 그림자 토큰입니다. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,

  // Existing Flowre aliases
  xxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const MIN_TOUCH_SIZE = 44;

const cardShadow =
  Platform.select({
    ios: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }) ?? {};

const modalShadow =
  Platform.select({
    ios: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }) ?? {};

export const Shadows = {
  card: cardShadow,
  modal: modalShadow,
  raised: modalShadow,
} as const;
