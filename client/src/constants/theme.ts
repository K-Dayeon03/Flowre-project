export const Colors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#06B6D4',
  background: '#F7F8FC',
  surface: '#FFFFFF',
  border: '#E6E8F0',
  textPrimary: '#1E1B2E',
  textSecondary: '#6B7280',
  textMuted: '#A5AAB8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  tabBar: '#FFFFFF',
  scheduleType: {
    MANNEQUIN: '#4F46E5',
    HQ_VISIT: '#06B6D4',
    VM_CHECK: '#10B981',
    OTHER: '#F59E0B',
  },
  statusBadge: {
    PENDING: '#F59E0B',
    IN_PROGRESS: '#06B6D4',
    DONE: '#10B981',
  },
};

export const Gradients = {
  brand: ['#4F46E5', '#06B6D4'] as const,
  brandDark: ['#4338CA', '#0891B2'] as const,
  soft: ['#EEF2FF', '#ECFEFF'] as const,
  success: ['#10B981', '#06B6D4'] as const,
};

export const Shadow = {
  card: {
    shadowColor: '#1E1B2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  raised: {
    shadowColor: '#1E1B2E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
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
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
};
