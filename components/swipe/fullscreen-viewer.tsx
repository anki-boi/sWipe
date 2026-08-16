import { Modal, View, TouchableOpacity, Image } from 'react-native';
import React, { useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { ResizeMode, Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';

interface FullscreenViewerProps {
    visible: boolean;
    asset: AssetType;
    /** Session-persistent muted state (shared with the swipe card). */
    isMuted: boolean;
    onToggleMuted: () => void;
    onClose: () => void;
}

const MAX_SCALE = 5;
const MIN_SCALE = 1;

/**
 * Shared fullscreen viewer for images (pinch-to-zoom + pan, tap to exit)
 * and videos (plays on mount, looping, audio toggle).
 *
 * Rendered inside an opaque RN Modal so all touches are captured and the
 * deck swipes underneath can never fire while fullscreen is open.
 */
const FullscreenViewer = ({
    visible,
    asset,
    isMuted,
    onToggleMuted,
    onClose,
}: FullscreenViewerProps) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = useMemo(
        () =>
            Gesture.Pinch()
                .onUpdate((event) => {
                    const nextScale = savedScale.value * event.scale;
                    scale.value = Math.min(
                        MAX_SCALE,
                        Math.max(MIN_SCALE, nextScale)
                    );
                })
                .onEnd(() => {
                    savedScale.value = scale.value;
                    // If zoomed back out, reset any pan.
                    if (scale.value <= MIN_SCALE) {
                        translateX.value = withTiming(0);
                        translateY.value = withTiming(0);
                        savedTranslateX.value = 0;
                        savedTranslateY.value = 0;
                    }
                }),
        [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]
    );

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                // Single finger only — two-finger gestures belong to pinch.
                .maxPointers(1)
                .onUpdate((event) => {
                    // Panning is only meaningful while zoomed in.
                    if (scale.value <= MIN_SCALE) return;
                    const maxX = (scale.value - 1) * 150;
                    const maxY = (scale.value - 1) * 150;
                    translateX.value = Math.min(
                        maxX,
                        Math.max(-maxX, savedTranslateX.value + event.translationX)
                    );
                    translateY.value = Math.min(
                        maxY,
                        Math.max(-maxY, savedTranslateY.value + event.translationY)
                    );
                })
                .onEnd(() => {
                    savedTranslateX.value = translateX.value;
                    savedTranslateY.value = translateY.value;
                }),
        [scale, translateX, translateY, savedTranslateX, savedTranslateY]
    );

    const tapGesture = useMemo(
        () =>
            Gesture.Tap()
                .maxDuration(250)
                .runOnJS(true)
                .onEnd((_event, success) => {
                    if (success) {
                        onClose();
                    }
                }),
        [onClose]
    );

    // Simultaneous(pinch, pan) + tap-to-exit.
    const composedGesture = useMemo(
        () => Gesture.Simultaneous(Gesture.Simultaneous(pinchGesture, panGesture), tapGesture),
        [pinchGesture, panGesture, tapGesture]
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const isVideo = asset?.mediaType === 'video';

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black">
                {visible && (
                    <>
                        {isVideo ? (
                            <View className="flex-1 items-center justify-center">
                                <Video
                                    source={{ uri: asset.uri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                    isLooping
                                    isMuted={isMuted}
                                />
                            </View>
                        ) : (
                            <GestureDetector gesture={composedGesture}>
                                <Animated.View
                                    style={[
                                        animatedStyle,
                                        {
                                            flex: 1,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        },
                                    ]}
                                >
                                    <Image
                                        source={{ uri: asset.uri }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                            </GestureDetector>
                        )}

                        {/* Close X (top-right) */}
                        <TouchableOpacity
                            onPress={onClose}
                            className="absolute top-12 right-4 bg-black/50 p-2 rounded-full"
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="close" size={28} color="white" />
                        </TouchableOpacity>

                        {/* Audio toggle (bottom-right, video only) */}
                        {isVideo && (
                            <TouchableOpacity
                                onPress={onToggleMuted}
                                className="absolute bottom-12 right-4 bg-black/50 p-3 rounded-full"
                                activeOpacity={0.7}
                            >
                                <MaterialIcons
                                    name={isMuted ? 'volume-off' : 'volume-up'}
                                    size={28}
                                    color="white"
                                />
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </Modal>
    );
};

export default FullscreenViewer;
