// FitForge Design System v2

export const colors = {
  bg: '#0C0C14',
  surface: '#14141F',
  elevated: '#1C1C2A',

  primary: '#E8A838',
  primaryMuted: 'rgba(232, 168, 56, 0.12)',

  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.12)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.12)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.12)',

  textPrimary: '#F0F0F5',
  textSecondary: '#8B8BA3',
  textTertiary: '#52526B',

  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
