import * as Haptics from 'expo-haptics';
import { getCachedPreferences } from '@/common/lib/preferences';

const enabled = () => getCachedPreferences().hapticsEnabled;

// Light tap, e.g. for a keep/skip swipe or toggling a selection
export function tapFeedback() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// Firmer tap for destructive choices, e.g. marking for deletion
export function warningFeedback() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function successFeedback() {
    if (enabled())
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
