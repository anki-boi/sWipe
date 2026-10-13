import { useColorScheme } from 'react-native';
import { palette, ThemeColors } from '@/constants/theme';

// Follows the system theme, or the override chosen in Settings (applied via
// Appearance.setColorScheme, which react-native's useColorScheme respects).
export function useTheme(): { isDark: boolean; colors: ThemeColors } {
    const isDark = useColorScheme() === 'dark';
    return { isDark, colors: isDark ? palette.dark : palette.light };
}
