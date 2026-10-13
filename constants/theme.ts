// Mirrors the CSS variables in app/global.css for places that need raw color
// values: icons, SVG strokes, gradients, ActivityIndicator, StatusBar.
export const palette = {
    light: {
        background: '#FFFFFF',
        surface: '#F3F4F6',
        card: '#FFFFFF',
        border: '#E5E7EB',
        foreground: '#111827',
        muted: '#6B7280',
        primary: '#2563EB',
        primaryStrong: '#1E3A8A',
        onPrimary: '#FFFFFF',
        danger: '#DC2626',
        success: '#16A34A',
        warning: '#D97706',
    },
    dark: {
        background: '#0B1120',
        surface: '#161E2E',
        card: '#1E293B',
        border: '#2B3648',
        foreground: '#F1F5F9',
        muted: '#94A3B8',
        primary: '#3B82F6',
        primaryStrong: '#1D4ED8',
        onPrimary: '#FFFFFF',
        danger: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
    },
} as const;

export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };
