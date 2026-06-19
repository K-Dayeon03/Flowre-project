// AdobeColor 어두운 그레이 팔레트
// #F2F2F2 · #BFBFBF · #8C8C8C · #595959 · #262626

export const Colors = {
  // 인터랙티브 액션 컬러 (팔레트 외 유일한 색상)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accent: '#60A5FA',

  // 팔레트 1: 밝은 그레이 캔버스
  background: '#F2F2F2',
  // 팔레트 밖: 순백 카드
  surface: '#FFFFFF',
  // 배경과 흰색 사이
  surfaceMuted: '#F7F7F7',

  // 팔레트 2: 테두리
  border: '#BFBFBF',
  // 팔레트 3: 강한 테두리
  borderStrong: '#8C8C8C',

  // 팔레트 5: 프라이머리 텍스트 (딥 차콜)
  textPrimary: '#262626',
  // 팔레트 4: 세컨더리 텍스트
  textSecondary: '#595959',
  // 팔레트 3: 뮤트 텍스트
  textMuted: '#8C8C8C',

  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',

  tabBar: '#262626',

  // AppHeader / 상단 네비게이션 바 (팔레트 5 기반)
  sidebar: '#262626',
  sidebarMuted: '#363636',
  sidebarText: '#8C8C8C',
  sidebarBorder: '#404040',

  scheduleType: {
    MANNEQUIN: '#7C3AED',
    HQ_VISIT: '#2563EB',
    VM_CHECK: '#059669',
    OTHER: '#D97706',
  },
  statusBadge: {
    PENDING: '#D97706',
    IN_PROGRESS: '#2563EB',
    DONE: '#059669',
  },
};

export const Gradients = {
  brand: ['#2563EB', '#60A5FA'] as const,
  brandDark: ['#1D4ED8', '#2563EB'] as const,
  soft: ['#FFFFFF', '#F2F2F2'] as const,
  success: ['#059669', '#34D399'] as const,
};

export const Shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
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
