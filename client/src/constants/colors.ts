/** 앱 전역 컬러 토큰입니다. 화면에서는 Colors.* 값을 통해서만 색상을 참조합니다. */
export const Colors = {
  // Primary
  primary50: '#EFF6FF',
  primary100: '#DBEAFE',
  primary500: '#3B82F6',
  primary600: '#2563EB',
  primary700: '#1D4ED8',

  // Neutral
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic
  success: '#10B981',
  success50: '#D1FAE5',
  success700: '#047857',
  warning: '#F59E0B',
  warning50: '#FEF3C7',
  warning700: '#B45309',
  danger: '#EF4444',
  danger50: '#FEE2E2',
  danger700: '#B91C1C',
  info: '#3B82F6',
  transparent: 'transparent',
  shadow: '#000000',

  // Background
  background: '#F9FAFB',
  surface: '#FFFFFF',

  // Existing Flowre aliases
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  accent: '#3B82F6',
  accentLight: '#EFF6FF',
  surfaceMuted: '#F3F4F6',
  border: '#E5E7EB',
  borderStrong: '#9CA3AF',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  error: '#EF4444',
  tabBar: '#FFFFFF',
  sidebar: '#111827',
  sidebarMuted: 'rgba(255, 255, 255, 0.07)',
  sidebarText: '#F3F4F6',
  sidebarBorder: 'rgba(255, 255, 255, 0.10)',

  scheduleType: {
    MANNEQUIN: '#8B5CF6',
    HQ_VISIT: '#F59E0B',
    VM_CHECK: '#3B82F6',
    OTHER: '#9CA3AF',
  },
  statusBadge: {
    PENDING: '#9CA3AF',
    IN_PROGRESS: '#3B82F6',
    DONE: '#10B981',
  },
} as const;

export type ColorKey = keyof typeof Colors;
