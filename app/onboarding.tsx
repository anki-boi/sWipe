import {
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import React, { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updatePreferences } from '@/common/lib/preferences';
import { tapFeedback } from '@/util/Haptics';

const PAGES = [
    {
        key: 'welcome',
        image: require('../assets/images/onboarding-1.png'),
        title: 'Welcome to sWipe',
        body: 'Clean up your gallery the quick way: one photo or video at a time, in a few swipes.',
    },
    {
        key: 'swipe',
        image: require('../assets/images/onboarding-2.png'),
        title: 'Swipe to decide',
        body: 'Swipe left to delete, right to keep, and up to skip for later.',
    },
    {
        key: 'safe',
        image: require('../assets/images/onboarding-3.png'),
        title: 'You stay in control',
        body: 'Nothing is deleted until you review and confirm. Everything stays on your device.',
    },
];

export default function Onboarding() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const listRef = useRef<FlatList>(null);
    const [index, setIndex] = useState(0);
    const isLast = index === PAGES.length - 1;

    const finishing = useRef(false);
    const finish = async () => {
        if (finishing.current) return;
        finishing.current = true;
        await updatePreferences({ hasSeenOnboarding: true });
        // Replayed from Settings: go back there instead of stacking a new Home
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    const next = () => {
        tapFeedback();
        if (isLast) {
            finish();
            return;
        }
        listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    };

    const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
        setIndex(Math.round(event.nativeEvent.contentOffset.x / width));

    return (
        <View
            className="flex-1 bg-background"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            <View className="h-12 flex-row items-center justify-end px-5">
                {!isLast && (
                    <Pressable
                        onPress={finish}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Skip onboarding"
                    >
                        <Text className="font-rubik-medium text-base text-muted">
                            Skip
                        </Text>
                    </Pressable>
                )}
            </View>
            <FlatList
                ref={listRef}
                data={PAGES}
                keyExtractor={(page) => page.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                getItemLayout={(_, i) => ({
                    length: width,
                    offset: width * i,
                    index: i,
                })}
                renderItem={({ item }) => (
                    <View style={{ width }} className="flex-1 px-8">
                        <View className="flex-1 items-center justify-center">
                            <Image
                                source={item.image}
                                contentFit="contain"
                                style={{ width: '100%', height: '85%' }}
                                accessibilityLabel={item.title}
                            />
                        </View>
                        <View className="pb-6">
                            <Text className="text-center font-rubik-bold text-3xl text-foreground">
                                {item.title}
                            </Text>
                            <Text className="mt-3 text-center font-rubik text-base text-muted">
                                {item.body}
                            </Text>
                        </View>
                    </View>
                )}
            />
            <View className="flex-row justify-center gap-2 py-4">
                {PAGES.map((page, i) => (
                    <View
                        key={page.key}
                        className={`h-2 rounded-full ${
                            i === index ? 'w-6 bg-primary' : 'w-2 bg-border'
                        }`}
                    />
                ))}
            </View>
            <View className="px-8 pb-4">
                <Pressable
                    onPress={next}
                    accessibilityRole="button"
                    className="items-center rounded-full bg-primary py-4 active:bg-primary-strong"
                >
                    <Text className="font-rubik-semibold text-base text-on-primary">
                        {isLast ? 'Get started' : 'Next'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
