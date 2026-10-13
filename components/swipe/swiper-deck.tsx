import {
    View,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Text,
    StyleSheet,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import SwipeCard from './swipe-card';
import {
    SwipeActionType,
    SwipeComponentInputType,
} from '@/common/types/SwipeMediaTypes';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';
import SwipeSession from '@/common/lib/localstorage/lib/SwipeSession';
import {
    acquireSession,
    getResetEpoch,
    propagateDeletes,
} from '@/common/lib/localstorage/SwipeStore';
import { getAssetSizes } from '@/util/ExpoFileUtil';
import {
    deleteMedia,
    deleteNeedsInAppConfirmation,
} from '@/common/lib/swipeandroid/SwipeAndroidLibary';
import { bytesToHumanReadable } from '@/util/MediaUtil';

const shadow3d = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
};

const END_CARD_URI = 'END_OF_DECK';

const confirmAsync = (title: string, message: string, confirmText: string) =>
    new Promise<boolean>((resolve) =>
        Alert.alert(
            title,
            message,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
                {
                    text: confirmText,
                    style: 'destructive',
                    onPress: () => resolve(true),
                },
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
        )
    );

const SwiperDeck = ({
    mediaAssets,
    swipeKey,
    screenKeyType,
    reloadAssets,
}: SwipeComponentInputType) => {
    const swiperRef = useRef<Swiper<AssetType>>(null);
    const [session, setSession] = useState<SwipeSession | null>(null);
    const [loadError, setLoadError] = useState(false);
    // Changes whenever the deck is rebuilt so Swiper picks up the new start index
    const [deckId, setDeckId] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    // Bumped after every session change so derived values re-render
    const [revision, setRevision] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // Number of cards swiped in the current Swiper instance that can be
    // animated back with swipeBack()
    const swipeBackDepth = useRef(0);
    // True while a card animation started by a button or undo is running;
    // Swiper ignores swipeBack() during animations, so undo must wait.
    const isAnimating = useRef(false);
    const animationTimeout = useRef<ReturnType<typeof setTimeout>>();
    // Bumped to rebuild the deck after progress was reset in Settings
    const [reloadToken, setReloadToken] = useState(0);
    const seenResetEpoch = useRef(getResetEpoch());

    const refresh = () => setRevision((r) => r + 1);

    const startAnimation = () => {
        isAnimating.current = true;
        clearTimeout(animationTimeout.current);
        // Failsafe in case Swiper never reports the end of the animation
        animationTimeout.current = setTimeout(endAnimation, 1500);
    };

    const endAnimation = () => {
        isAnimating.current = false;
        clearTimeout(animationTimeout.current);
    };

    useEffect(() => () => clearTimeout(animationTimeout.current), []);

    useEffect(() => {
        let cancelled = false;
        let release: (() => void) | undefined;
        setLoadError(false);
        acquireSession(screenKeyType, swipeKey)
            .then(({ session: loaded, release: releaseSession }) => {
                release = releaseSession;
                if (cancelled) {
                    releaseSession();
                    return;
                }
                const first = loaded.sync(mediaAssets.map((a) => a.uri));
                loaded.scheduleSave();
                swipeBackDepth.current = 0;
                setSession(loaded);
                setStartIndex(first);
                setCurrentIndex(first);
                setDeckId((id) => id + 1);
                refresh();
                setShowConfirmation(
                    first >= mediaAssets.length &&
                        loaded.getPendingDeleteUris().length > 0
                );
            })
            .catch((error) => {
                console.error('Failed to open swipe session', error);
                if (!cancelled) setLoadError(true);
            });
        return () => {
            cancelled = true;
            release?.();
        };
    }, [swipeKey, screenKeyType, mediaAssets, reloadToken]);

    useFocusEffect(
        useCallback(() => {
            if (seenResetEpoch.current !== getResetEpoch()) {
                seenResetEpoch.current = getResetEpoch();
                setReloadToken((token) => token + 1);
            }
            // Persist progress when leaving the screen
            return () => {
                session?.flush();
            };
        }, [session])
    );

    const pendingDeletes = useMemo(() => {
        if (!session) return [];
        const pending = new Set(session.getPendingDeleteUris());
        return mediaAssets.filter((asset) => pending.has(asset.uri));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, mediaAssets, revision]);

    const canUndo = useMemo(
        () => !!session?.canUndo(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [session, revision]
    );

    const isAtEnd = currentIndex >= mediaAssets.length;

    const handleSwiped = (action: SwipeActionType, cardIndex: number) => {
        const asset = mediaAssets[cardIndex];
        if (!asset || !session) {
            return;
        }
        session.record(asset.uri, action);
        session.scheduleSave();
        swipeBackDepth.current++;
        setCurrentIndex(cardIndex + 1);
        refresh();
        if (cardIndex === mediaAssets.length - 1) {
            setShowConfirmation(true);
        }
    };

    const swipeWithButton = (direction: 'left' | 'right') => {
        if (isAnimating.current || !swiperRef.current) {
            return;
        }
        startAnimation();
        if (direction === 'left') swiperRef.current.swipeLeft();
        else swiperRef.current.swipeRight();
    };

    const undoLastAction = () => {
        if (!session || !swiperRef.current || isAnimating.current) {
            return;
        }
        const entry = session.undo();
        if (!entry) {
            return;
        }
        session.scheduleSave();
        setShowConfirmation(false);
        refresh();

        const index = mediaAssets.findIndex((a) => a.uri === entry.uri);
        if (index < 0) {
            return;
        }
        if (index === currentIndex - 1 && swipeBackDepth.current > 0) {
            swipeBackDepth.current--;
            startAnimation();
            swiperRef.current.swipeBack();
        } else {
            swipeBackDepth.current = 0;
            swiperRef.current.jumpToCardIndex(index);
        }
        setCurrentIndex(index);
    };

    const handleReviewAgain = () => {
        setShowConfirmation(false);
        swipeBackDepth.current = 0;
        swiperRef.current?.jumpToCardIndex(0);
        setCurrentIndex(0);
    };

    const proceedToDelete = async () => {
        if (!session || isDeleting) {
            return;
        }
        if (pendingDeletes.length === 0) {
            setShowConfirmation(false);
            Alert.alert(
                'Nothing to delete',
                'Swipe left on the items you want to delete.'
            );
            return;
        }

        setIsDeleting(true);
        try {
            const sizes = await getAssetSizes(
                pendingDeletes.map((asset) => asset.uri)
            );
            // Items already gone from the device can't be deleted again
            const missing = pendingDeletes.filter((_, i) => sizes[i] === null);
            const toDelete = pendingDeletes
                .map((asset, i) => ({ ...asset, assetSize: sizes[i] ?? 0 }))
                .filter((_, i) => sizes[i] !== null);
            if (missing.length > 0) {
                session.forget(missing.map((asset) => asset.uri));
            }
            if (toDelete.length === 0) {
                await reloadAssets();
                return;
            }

            const totalSize = toDelete.reduce((t, a) => t + a.assetSize, 0);
            if (
                deleteNeedsInAppConfirmation() &&
                !(await confirmAsync(
                    'Delete media?',
                    `${toDelete.length} item(s) (${bytesToHumanReadable(totalSize)}) will be permanently deleted.`,
                    'Delete'
                ))
            ) {
                return;
            }

            const result = await deleteMedia(toDelete);
            if (result.status === 'deleted') {
                session.markDeleted(
                    toDelete.map((asset) => asset.uri),
                    totalSize
                );
                await session.flush();
                await propagateDeletes(screenKeyType, toDelete);
                setShowConfirmation(false);
                Alert.alert(
                    'Deleted',
                    `Deleted ${toDelete.length} item(s) and freed ${bytesToHumanReadable(totalSize)}.`
                );
                await reloadAssets();
            } else if (result.status === 'failed') {
                Alert.alert('Could not delete', result.message);
            }
        } catch (error) {
            console.error('Error deleting assets:', error);
            Alert.alert('Error', 'Failed to delete the selected media.');
        } finally {
            session.scheduleSave();
            refresh();
            setIsDeleting(false);
        }
    };

    const overlayLabels = useMemo(() => {
        const labelStyle = (backgroundColor: string) => ({
            label: {
                backgroundColor,
                color: 'white',
                fontSize: 24,
                borderRadius: 12,
                padding: 10,
                overflow: 'hidden' as const,
            },
            wrapper: {
                flexDirection: 'column' as const,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
            },
        });
        return {
            left: { title: 'Delete', style: labelStyle('#dc2626') },
            right: { title: 'Keep', style: labelStyle('#16a34a') },
        };
    }, []);

    const cards = useMemo(() => {
        const endCard: AssetType = {
            id: END_CARD_URI,
            index: mediaAssets.length,
            uri: END_CARD_URI,
            albumId: undefined,
            creationTime: 0,
            assetSize: 0,
            width: 0,
            height: 0,
            filename: '',
            mediaType: '',
        };
        return [...mediaAssets, endCard];
    }, [mediaAssets]);

    const renderCard = (item: AssetType | undefined, index: number) => {
        if (!item) return null;
        if (item.uri === END_CARD_URI) {
            return (
                <View className="flex-1 bg-gray-100 rounded-3xl justify-center items-center p-6">
                    <Text className="text-xl font-bold text-gray-700 mb-2">
                        All caught up
                    </Text>
                    <Text className="text-gray-500 text-center">
                        You've gone through everything here.
                    </Text>
                </View>
            );
        }
        return (
            <SwipeCard
                item={item}
                index={index}
                totalCount={mediaAssets.length}
                isActive={index === currentIndex}
            />
        );
    };

    if (loadError) {
        return (
            <View style={styles.centered}>
                <Text className="text-gray-500">
                    Couldn't load your progress.
                </Text>
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const pendingSize = pendingDeletes.reduce((t, a) => t + a.assetSize, 0);

    return (
        <View className="flex-1">
            {showConfirmation && (
                <View className="absolute inset-0 bg-black/70 z-50 justify-center items-center p-6">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <Text className="text-xl font-bold text-center mb-4">
                            All Done!
                        </Text>
                        <Text className="text-gray-700 text-center mb-6">
                            {pendingDeletes.length > 0
                                ? `You marked ${pendingDeletes.length} item(s) for deletion${pendingSize ? ` (${bytesToHumanReadable(pendingSize)})` : ''}. Delete them now?`
                                : 'You have reviewed everything here and nothing is marked for deletion.'}
                        </Text>
                        <View className="flex-row justify-between gap-x-4">
                            <TouchableOpacity
                                className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
                                onPress={handleReviewAgain}
                                disabled={isDeleting}
                            >
                                <Text className="text-gray-800 font-medium">
                                    Review Again
                                </Text>
                            </TouchableOpacity>
                            {pendingDeletes.length > 0 && (
                                <TouchableOpacity
                                    className="flex-1 bg-red-600 py-3 rounded-lg items-center"
                                    onPress={proceedToDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-medium">
                                            Delete
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}
            <View className="flex-1 bg-transparent z-10">
                <Swiper
                    key={deckId}
                    ref={swiperRef}
                    containerStyle={{ backgroundColor: 'transparent' }}
                    cards={cards}
                    cardIndex={startIndex}
                    stackSize={Math.min(2, cards.length)}
                    disableTopSwipe
                    disableBottomSwipe
                    disableLeftSwipe={isAtEnd || isDeleting}
                    disableRightSwipe={isAtEnd || isDeleting}
                    onSwipedLeft={(cardIndex) =>
                        handleSwiped(SwipeActionType.DELETE, cardIndex)
                    }
                    onSwipedRight={(cardIndex) =>
                        handleSwiped(SwipeActionType.KEEP, cardIndex)
                    }
                    // Fires after every completed swipe and swipe-back
                    onSwiped={endAnimation}
                    onSwipedAborted={endAnimation}
                    keyExtractor={(item: AssetType) => item.uri}
                    swipeBackCard
                    animateCardOpacity
                    swipeAnimationDuration={100}
                    animateOverlayLabelsOpacity
                    overlayLabels={overlayLabels}
                    renderCard={renderCard}
                    stackAnimationFriction={15}
                    stackAnimationTension={80}
                />
            </View>
            <View className="h-1/3 flex flex-row items-center justify-around z-50">
                <DeckButton
                    label="Delete"
                    icon={<MaterialCommunityIcons name="delete" size={25} />}
                    color="#dc2626"
                    disabled={isAtEnd || showConfirmation || isDeleting}
                    onPress={() => swipeWithButton('left')}
                />
                <DeckButton
                    label="Undo"
                    icon={<MaterialCommunityIcons name="undo" size={25} />}
                    color="#3b82f6"
                    disabled={!canUndo || isDeleting}
                    onPress={undoLastAction}
                />
                <DeckButton
                    label={`Delete ${pendingDeletes.length} marked item(s)`}
                    icon={<MaterialIcons name="done-all" size={25} />}
                    color="#1d4ed8"
                    disabled={pendingDeletes.length === 0 || isDeleting}
                    onPress={() => setShowConfirmation(true)}
                    badge={pendingDeletes.length}
                />
                <DeckButton
                    label="Keep"
                    icon={<MaterialCommunityIcons name="check" size={25} />}
                    color="#16a34a"
                    disabled={isAtEnd || showConfirmation || isDeleting}
                    onPress={() => swipeWithButton('right')}
                />
            </View>
        </View>
    );
};

const DeckButton = ({
    label,
    icon,
    color,
    disabled,
    onPress,
    badge,
}: {
    label: string;
    icon: React.ReactElement<{ color?: string }>;
    color: string;
    disabled: boolean;
    onPress: () => void;
    badge?: number;
}) => (
    <TouchableOpacity
        style={[shadow3d, disabled && { opacity: 0.5 }]}
        className="h-20 w-20 rounded-full bg-gray-50 flex justify-center items-center border border-gray-100"
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
    >
        {React.cloneElement(icon, { color: disabled ? '#9ca3af' : color })}
        {!!badge && (
            <View className="absolute -top-1 -right-1 bg-red-600 rounded-full min-w-6 h-6 px-1 items-center justify-center">
                <Text className="text-white text-xs font-bold">{badge}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SwiperDeck;
