import {
    View,
    Text,
    Pressable,
    Alert,
    Linking,
    Switch,
    ScrollView,
} from 'react-native';
import React from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Title } from '@/components/common/title';
import { clearAllProgress } from '@/common/lib/localstorage/SwipeStore';
import { ThemePreference } from '@/common/lib/preferences';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';

const SOURCE_URL = 'https://github.com/madhavpcm/sWipe';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const GOAL_OPTIONS = [0, 25, 50, 100, 200];

const Section = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <View className="mt-6">
        <Text className="text-xs font-rubik-semibold uppercase tracking-wider text-muted mb-2 px-1">
            {title}
        </Text>
        <View className="bg-card rounded-2xl border border-border overflow-hidden">
            {children}
        </View>
    </View>
);

const Row = ({
    icon,
    title,
    subtitle,
    onPress,
    destructive,
    right,
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    destructive?: boolean;
    right?: React.ReactNode;
}) => {
    const { colors } = useTheme();
    return (
        <Pressable
            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border active:bg-surface"
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : undefined}
        >
            <MaterialIcons
                name={icon}
                size={22}
                color={destructive ? colors.danger : colors.primary}
            />
            <View className="flex-1">
                <Text
                    className={`text-base font-rubik-medium ${destructive ? 'text-danger' : 'text-foreground'}`}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text className="text-sm font-rubik text-muted">
                        {subtitle}
                    </Text>
                )}
            </View>
            {right}
        </Pressable>
    );
};

// A row of mutually exclusive pills
function Segmented<T extends string | number>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <View className="flex-row gap-2 px-4 pb-4 flex-wrap">
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={String(option.value)}
                        onPress={() => onChange(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        className={`px-4 py-2 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
                    >
                        <Text
                            className={`font-rubik-medium ${selected ? 'text-on-primary' : 'text-foreground'}`}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export default function SettingsScreen() {
    const { colors } = useTheme();
    const [preferences, updatePreferences] = usePreferences();

    const resetProgress = () =>
        Alert.alert(
            'Reset progress?',
            'This forgets every swipe, your streak and all cleanup stats. Your photos and videos are not affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllProgress();
                        Alert.alert('Done', 'Your progress has been reset.');
                    },
                },
            ]
        );

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        >
            <Title text="Settings" />

            <Section title="Appearance">
                <Row icon="palette" title="Theme" />
                <Segmented
                    options={THEME_OPTIONS}
                    value={preferences.theme}
                    onChange={(theme) => updatePreferences({ theme })}
                />
                <Row
                    icon="vibration"
                    title="Haptic feedback"
                    subtitle="Vibrate lightly on each swipe"
                    right={
                        <Switch
                            value={preferences.hapticsEnabled}
                            onValueChange={(hapticsEnabled) => {
                                updatePreferences({ hapticsEnabled });
                            }}
                            trackColor={{ true: colors.primary }}
                            accessibilityLabel="Haptic feedback"
                        />
                    }
                />
            </Section>

            <Section title="Daily goal">
                <Row
                    icon="flag"
                    title="Items to review per day"
                    subtitle="Keep a streak going by meeting it every day"
                />
                <Segmented
                    options={GOAL_OPTIONS.map((goal) => ({
                        value: goal,
                        label: goal === 0 ? 'Off' : String(goal),
                    }))}
                    value={preferences.dailyGoal}
                    onChange={(dailyGoal) => updatePreferences({ dailyGoal })}
                />
            </Section>

            <Section title="Data">
                <Row
                    icon="restart-alt"
                    title="Reset progress"
                    subtitle="Forget all swipes, stats and streaks"
                    onPress={resetProgress}
                    destructive
                />
            </Section>

            <Section title="About">
                <Row
                    icon="school"
                    title="Show intro again"
                    onPress={() => router.push('/onboarding')}
                />
                <Row
                    icon="code"
                    title="Source code"
                    subtitle={SOURCE_URL.replace('https://', '')}
                    onPress={() => Linking.openURL(SOURCE_URL)}
                />
                <Row
                    icon="info-outline"
                    title="Version"
                    subtitle={Constants.expoConfig?.version ?? 'unknown'}
                />
            </Section>
        </ScrollView>
    );
}
