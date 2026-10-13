import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { cardShadow } from './swipe-card';

type IconName = keyof typeof MaterialIcons.glyphMap;
export type ActionTone = 'danger' | 'success' | 'primary' | 'muted';

/** Thin bar plus "x of N reviewed", shown under the screen title. */
export const ProgressHeader = ({
    reviewed,
    total,
}: {
    reviewed: number;
    total: number;
}) => {
    const percent = total > 0 ? Math.min(100, (reviewed / total) * 100) : 0;
    return (
        <View className="mb-1 px-1">
            <View
                className="h-1.5 overflow-hidden rounded-full bg-surface"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: total, now: reviewed }}
            >
                <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                />
            </View>
            <Text className="mt-1 font-rubik text-xs text-muted">
                {reviewed} of {total} reviewed
            </Text>
        </View>
    );
};

/** Round icon button for the bottom action bar. */
export const ActionButton = ({
    label,
    icon,
    tone,
    disabled,
    onPress,
    size = 64,
}: {
    label: string;
    icon: IconName;
    tone: ActionTone;
    disabled: boolean;
    onPress: () => void;
    size?: number;
}) => {
    const { colors } = useTheme();
    const tint = disabled ? colors.muted : colors[tone];
    return (
        <View className="items-center">
            <TouchableOpacity
                style={[
                    { width: size, height: size, borderRadius: size / 2 },
                    cardShadow,
                    disabled && { opacity: 0.45 },
                ]}
                className="items-center justify-center border border-border bg-card"
                onPress={onPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled }}
            >
                <MaterialIcons
                    name={icon}
                    size={Math.round(size * 0.45)}
                    color={tint}
                />
            </TouchableOpacity>
            <Text className="mt-1.5 font-rubik-medium text-xs text-muted">
                {label}
            </Text>
        </View>
    );
};

/** Pill above the action bar leading to the review screen. */
export const ReviewPill = ({
    count,
    onPress,
    disabled,
}: {
    count: number;
    onPress: () => void;
    disabled: boolean;
}) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            className="flex-row items-center self-center rounded-full bg-danger/10 py-2 pl-4 pr-2"
            accessibilityRole="button"
            accessibilityLabel={`Review ${count} marked items`}
            accessibilityState={{ disabled }}
        >
            <MaterialIcons name="fact-check" size={18} color={colors.danger} />
            <Text className="ml-2 font-rubik-medium text-sm text-danger">
                Review marked
            </Text>
            <View className="ml-2 h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1.5">
                <Text className="font-rubik-bold text-xs text-on-primary">
                    {count}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const Stat = ({
    value,
    label,
    tone,
}: {
    value: number;
    label: string;
    tone: 'text-success' | 'text-primary' | 'text-danger';
}) => (
    <View className="flex-1 items-center rounded-2xl bg-surface py-3">
        <Text className={`font-rubik-bold text-2xl ${tone}`}>{value}</Text>
        <Text className="font-rubik text-xs text-muted">{label}</Text>
    </View>
);

/** End-of-deck card summarising what happened, with the next steps. */
export const EndSummary = ({
    kept,
    skipped,
    marked,
    onReview,
    onStartOver,
}: {
    kept: number;
    skipped: number;
    marked: number;
    onReview: () => void;
    onStartOver: () => void;
}) => {
    const { colors } = useTheme();
    return (
        <View
            className="flex-1 items-center justify-center rounded-3xl border border-border bg-card p-6"
            style={cardShadow}
        >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-success/15">
                <MaterialIcons name="check" size={36} color={colors.success} />
            </View>
            <Text className="font-rubik-semibold text-2xl text-foreground">
                All done!
            </Text>
            <Text className="mb-5 mt-1 text-center font-rubik text-sm text-muted">
                {marked > 0
                    ? `${marked} ${marked === 1 ? 'item is' : 'items are'} marked for deletion.`
                    : 'Nothing is marked for deletion.'}
            </Text>
            <View className="mb-6 w-full flex-row gap-x-2">
                <Stat value={kept} label="Kept" tone="text-success" />
                <Stat value={skipped} label="Skipped" tone="text-primary" />
                <Stat value={marked} label="Marked" tone="text-danger" />
            </View>
            {marked > 0 && (
                <TouchableOpacity
                    onPress={onReview}
                    className="mb-3 h-12 w-full items-center justify-center rounded-full bg-danger"
                    accessibilityRole="button"
                    accessibilityLabel="Review and delete"
                >
                    <Text className="font-rubik-semibold text-base text-on-primary">
                        Review & delete
                    </Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={onStartOver}
                className="h-12 w-full items-center justify-center rounded-full border border-border bg-surface"
                accessibilityRole="button"
                accessibilityLabel="Start over"
            >
                <Text className="font-rubik-medium text-base text-foreground">
                    Start over
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export const Centered = ({ children }: { children: React.ReactNode }) => (
    <View className="flex-1 items-center justify-center">{children}</View>
);

export const Spinner = () => {
    const { colors } = useTheme();
    return (
        <Centered>
            <ActivityIndicator size="large" color={colors.primary} />
        </Centered>
    );
};
