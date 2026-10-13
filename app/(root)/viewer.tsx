import { Modal, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;

// Pure black behind media, whatever the app theme is
const BACKDROP = 'black';
const ON_BACKDROP = 'white';

const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
};

const ZoomableImage = ({ uri }: { uri: string }) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedX = useSharedValue(0);
    const savedY = useSharedValue(0);
    const width = useSharedValue(0);
    const height = useSharedValue(0);

    // Keeps the zoomed image from being dragged past its edges
    const clampTranslation = () => {
        'worklet';
        const maxX = (width.value * (scale.value - 1)) / 2;
        const maxY = (height.value * (scale.value - 1)) / 2;
        translateX.value = clamp(translateX.value, -maxX, maxX);
        translateY.value = clamp(translateY.value, -maxY, maxY);
    };

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = clamp(savedScale.value * e.scale, 1, MAX_ZOOM);
            clampTranslation();
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            savedX.value = translateX.value;
            savedY.value = translateY.value;
        });

    const pan = Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .onUpdate((e) => {
            if (scale.value <= 1) return;
            translateX.value = savedX.value + e.translationX;
            translateY.value = savedY.value + e.translationY;
            clampTranslation();
        })
        .onEnd(() => {
            savedX.value = translateX.value;
            savedY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            const zoomIn = scale.value <= 1.01;
            const target = zoomIn ? DOUBLE_TAP_ZOOM : 1;
            scale.value = withTiming(target);
            savedScale.value = target;
            if (!zoomIn) {
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedX.value = 0;
                savedY.value = 0;
            }
        });

    const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                style={[{ flex: 1 }, animatedStyle]}
                onLayout={(e) => {
                    width.value = e.nativeEvent.layout.width;
                    height.value = e.nativeEvent.layout.height;
                }}
            >
                <Image
                    source={{ uri }}
                    style={{ flex: 1 }}
                    contentFit="contain"
                    accessibilityLabel="Photo"
                />
            </Animated.View>
        </GestureDetector>
    );
};

const VideoViewer = ({ uri }: { uri: string }) => {
    const player = useVideoPlayer(uri, (p) => {
        p.loop = false;
        p.play();
    });
    return (
        <VideoView
            player={player}
            style={{ flex: 1 }}
            contentFit="contain"
            nativeControls
        />
    );
};

export default function ViewerScreen() {
    const { uri, mediaType } = useLocalSearchParams<{
        uri: string;
        mediaType: string;
    }>();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(true);

    const close = () => {
        setVisible(false);
        if (router.canGoBack()) router.back();
    };

    return (
        // A modal covers the app header too, so the viewer is truly full screen
        <Modal
            visible={visible}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={close}
        >
            <GestureHandlerRootView
                style={{ flex: 1, backgroundColor: BACKDROP }}
            >
                {uri ? (
                    mediaType === 'video' ? (
                        <VideoViewer uri={uri} />
                    ) : (
                        <ZoomableImage uri={uri} />
                    )
                ) : null}
                <View
                    pointerEvents="box-none"
                    style={{
                        position: 'absolute',
                        top: insets.top + 8,
                        left: 16,
                    }}
                >
                    <TouchableOpacity
                        onPress={close}
                        className="h-11 w-11 items-center justify-center rounded-full bg-black/60"
                        accessibilityRole="button"
                        accessibilityLabel="Close viewer"
                        hitSlop={8}
                    >
                        <MaterialIcons
                            name="close"
                            size={26}
                            color={ON_BACKDROP}
                        />
                    </TouchableOpacity>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}
