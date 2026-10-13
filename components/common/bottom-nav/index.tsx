import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

const AnimatedTouchableOpacity =
    Animated.createAnimatedComponent(TouchableOpacity);

const TABS: {
    name: string;
    route: '/' | '/album' | '/month';
    icon: 'home' | 'perm-media' | 'calendar-month';
}[] = [
    { name: 'Home', route: '/', icon: 'home' },
    { name: 'Albums', route: '/album', icon: 'perm-media' },
    { name: 'Timeline', route: '/month', icon: 'calendar-month' },
];

export const BottomNav = () => {
    const navigation = useRouter();
    const pathname = usePathname();
    const { colors } = useTheme();

    return (
        <LinearGradient
            colors={[colors.primary, colors.primaryStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            {TABS.map((tab) => {
                const isFocused = pathname === tab.route;
                return (
                    <AnimatedTouchableOpacity
                        key={tab.route}
                        onPress={() => {
                            if (!isFocused) navigation.navigate(tab.route);
                        }}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.name}
                        accessibilityState={{ selected: isFocused }}
                        layout={LinearTransition.springify().mass(0.5)}
                        style={[
                            styles.tabItem,
                            {
                                backgroundColor: isFocused
                                    ? colors.onPrimary
                                    : 'transparent',
                            },
                        ]}
                    >
                        <MaterialIcons
                            name={tab.icon}
                            size={26}
                            color={
                                isFocused ? colors.primary : colors.onPrimary
                            }
                        />
                        {isFocused && (
                            <Animated.Text
                                entering={FadeIn.duration(200)}
                                exiting={FadeOut.duration(200)}
                                style={[styles.text, { color: colors.primary }]}
                            >
                                {tab.name}
                            </Animated.Text>
                        )}
                    </AnimatedTouchableOpacity>
                );
            })}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '80%',
        alignSelf: 'center',
        bottom: 32,
        borderRadius: 40,
        paddingHorizontal: 12,
        paddingVertical: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    tabItem: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 30,
    },
    text: {
        marginLeft: 8,
        fontFamily: 'Rubik-Medium',
    },
});
