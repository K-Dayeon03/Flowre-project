// Flowre admin palette
// Warm canvas with restrained charcoal, teal, and clear operational status colors.

export const Colors = {
  // 브랜드 컬러
  primary: '#1D7E8B',
  primaryDark: '#223437',
  accent: '#20808D',
  accentLight: '#EDF7F5',

  // 배경 · 서피스
  background: '#F9F9F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F6F2',

  // 테두리
  border: '#E3E5E1',
  borderStrong: '#B8C5C0',

  // 텍스트
  textPrimary: '#223437',
  textSecondary: '#5A6A6D',
  textMuted: '#7B8785',

  // 시스템 색상
  success: '#15803D',
  warning: '#B45309',
  error: '#B91C1C',
  info: '#1D7E8B',

  // 탭바
  tabBar: '#223437',

  // 앱 헤더
  sidebar: '#223437',
  sidebarMuted: '#2D4549',
  sidebarText: '#D6D5D4',
  sidebarBorder: '#3B595F',

  scheduleType: {
    MANNEQUIN: '#6D5A8D',
    HQ_VISIT: '#1D7E8B',
    VM_CHECK: '#2F7D61',
    OTHER: '#A16207',
  },
  statusBadge: {
    PENDING: '#B45309',
    IN_PROGRESS: '#1D7E8B',
    DONE: '#15803D',
  },
};

export const Gradients = {
  brand: ['#223437', '#1D7E8B'] as const,
  brandDark: ['#171615', '#1E1D1C'] as const,
  soft: ['#FFFFFF', '#F9F9F6'] as const,
  success: ['#15803D', '#2F7D61'] as const,
};

export const Shadow = {
  card: {
    shadowColor: '#223437',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  raised: {
    shadowColor: '#223437',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.11,
    shadowRadius: 10,
    elevation: 3,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 40,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
};
