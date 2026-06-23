// Deep Blue Corporate palette
// Primary: #1E3A8A (딥 네이비) · Background: #F0F4FF · Surface: #FFFFFF

export const Colors = {
  // 브랜드 컬러
  primary: '#1E3A8A',       // 딥 네이비 (Tailwind blue-900)
  primaryDark: '#1E2F77',
  accent: '#3B82F6',        // 브라이트 블루 (blue-500)
  accentLight: '#EFF6FF',   // blue-50

  // 배경 · 서피스
  background: '#F0F4FF',    // 연한 블루 캔버스
  surface: '#FFFFFF',
  surfaceMuted: '#F5F8FF',  // 블루 틴트 서피스

  // 테두리
  border: '#DBEAFE',        // blue-100
  borderStrong: '#93C5FD',  // blue-300

  // 텍스트
  textPrimary: '#0F172A',   // slate-950
  textSecondary: '#334155', // slate-700
  textMuted: '#64748B',     // slate-500

  // 시스템 색상
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // 탭바
  tabBar: '#1E3A8A',

  // 앱 헤더 (딥 네이비)
  sidebar: '#0F2060',
  sidebarMuted: '#1A2F7A',
  sidebarText: '#93C5FD',   // blue-300 — 어두운 배경 위 가독성
  sidebarBorder: '#1E3FAB',

  scheduleType: {
    MANNEQUIN: '#7C3AED',
    HQ_VISIT: '#1E3A8A',
    VM_CHECK: '#059669',
    OTHER: '#D97706',
  },
  statusBadge: {
    PENDING: '#D97706',
    IN_PROGRESS: '#1E3A8A',
    DONE: '#059669',
  },
};

export const Gradients = {
  brand: ['#1E3A8A', '#2563EB'] as const,
  brandDark: ['#0F172A', '#1E3A8A'] as const,
  soft: ['#FFFFFF', '#F0F4FF'] as const,
  success: ['#059669', '#34D399'] as const,
};

export const Shadow = {
  card: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  raised: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
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
