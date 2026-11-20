/** 앱 전역 타이포그래피 토큰입니다. React Native 시스템 폰트 기준으로 정의합니다. */
export const Typography = {
  fontFamily: {
    regular: undefined,
    medium: undefined,
    semibold: undefined,
    bold: undefined,
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.7,
  },
} as const;
