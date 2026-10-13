import { View, Text, LayoutChangeEvent } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeCard from './swipe-card';
import {
    ActionButton,
    EndSummary,
    ProgressHeader,
    ReviewPill,
    Spinner,
} from './deck-controls';
import {
    SwipeActionType,
    SwipeComponentInputType,
} from '@/common/types/SwipeMediaTypes';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';
import SwipeSession from '@/common/lib/localstorage/lib/SwipeSession';
import {
    acquireSession,
    getResetEpoch,
} from '@/common/lib/localstorage/SwipeStore';
import { recordReviewed } from '@/common/lib/goals/DailyProgress';
import { successFeedback, tapFeedback, warningFeedback } from '@/util/Haptics';
import { useTheme } from '@/hooks/useTheme';

const END_CARD_URI = 'END_OF_DECK';
const CARD_MARGIN_X = 12;
const CARD_MARGIN_TOP = 4;
// Room below the top card for the cards stacked behind it
const CARD_MARGIN_BOTTOM = 24;

type Direction = 'left' | 'right' | 'top';

const labelWrapper = (
    alignItems: 'flex-start' | 'flex-end' | 'center',
    justifyContent: 'flex-start' | 'center'
) => ({
    flexDirection: 'column' as const,
    alignItems,
    justifyContent,
    padding: 28,
});

const Stamp = ({ text, color }: { text: string; color: string }) => (
    <View
        style={{
            borderWidth: 3,
            borderColor: color,
            backgroundColor: color,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 6,
            transform: [
                {
                    rotate:
                        text === 'DELETE'
                            ? '12deg'
                            : text === 'KEEP'
                              ? '-12deg'
                              : '0deg',
                },
            ],
        }}
    >
        <Text className="font-rubik-bold text-2xl tracking-widest text-on-primary">
            {text}
        </Text>
    </View>
);

const SwiperDeck = ({
    mediaAssets,
    swipeKey,
    screenKeyType,
    reloadAssets,
}: SwipeComponentInputType) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const swiperRef = useRef<Swiper<AssetType>>(null);
    const [session, setSession] = useState<SwipeSession | null>(null);
    const [loadError, setLoadError] = useState(false);
    // Changes whenever the deck is rebuilt so Swiper picks up the new start index
    const [deckId, setDeckId] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    // Bumped after every session change so derived values re-render
    const [revision, setRevision] = useState(0);
    // Size of the area the cards are laid out in
    const [area, setArea] = useState<{ width: number; height: number } | null>(
        null
    );
    // Number of cards swiped in the current Swiper instance that can be
    // animated back with swipeBack()
    const swipeBackDepth = useRef(0);
    // Last drag offset reported by Swiper, used to classify the swipe
    const lastDrag = useRef<{ x: number; y: number } | null>(null);
    // True while a card animation started by a button or undo is running;
    // Swiper ignores swipeBack() during animations, so undo must wait.
    const isAnimating = useRef(false);
    const animationTimeout = useRef<ReturnType<typeof setTimeout>>();
    // Bumped to rebuild the deck after progress was reset in Settings
    const [reloadToken, setReloadToken] = useState(0);
    const seenResetEpoch = useRef(getResetEpoch());
    // Session revision this deck last accounted for. When it differs on focus,
    // another screen (the review screen) changed decisions or deleted items.
    const seenSessionRevision = useRef(0);

    const refresh = () => {
        if (session) seenSessionRevision.current = session.revision;
        setRevision((r) => r + 1);
    };

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
                seenSessionRevision.current = loaded.revision;
                swipeBackDepth.current = 0;
                setSession(loaded);
                setStartIndex(first);
                setCurrentIndex(first);
                setDeckId((id) => id + 1);
                setRevision((r) => r + 1);
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
            } else if (
                session &&
                session.revision !== seenSessionRevision.current
            ) {
                // The review screen kept or deleted items while we were away
                seenSessionRevision.current = session.revision;
                reloadAssets();
            }
            // Persist progress when leaving the screen
            return () => {
                session?.flush();
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const keepCount = session?.metadata.keepCount ?? 0;
    const skipCount = session?.metadata.skipCount ?? 0;
    const reviewed = keepCount + skipCount + pendingDeletes.length;

    // The library picks right/left before top using fixed thresholds, so an
    // upward drag that drifts sideways would count as Keep/Delete even though
    // the overlay showed SKIP. Classify drags by their dominant axis instead.
    const resolveAction = (fallback: SwipeActionType): SwipeActionType => {
        const drag = lastDrag.current;
        lastDrag.current = null;
        if (!drag) return fallback;
        if (drag.y < 0 && Math.abs(drag.y) > Math.abs(drag.x)) {
            return SwipeActionType.SKIP;
        }
        if (fallback === SwipeActionType.SKIP) {
            return drag.x < 0 ? SwipeActionType.DELETE : SwipeActionType.KEEP;
        }
        return fallback;
    };

    const handleSwiped = (swiped: SwipeActionType, cardIndex: number) => {
        const asset = mediaAssets[cardIndex];
        const action = resolveAction(swiped);
        if (!asset || !session) {
            return;
        }
        if (action === SwipeActionType.DELETE) warningFeedback();
        else tapFeedback();
        // Re-swiping after "Start over" changes a decision; it isn't new work
        const isNewReview = session.getDecision(asset.uri) === undefined;
        session.record(asset.uri, action);
        session.scheduleSave();
        if (isNewReview) recordReviewed(1);
        swipeBackDepth.current++;
        setCurrentIndex(cardIndex + 1);
        refresh();
        if (cardIndex === mediaAssets.length - 1) {
            successFeedback();
        }
    };

    const swipeWithButton = (direction: Direction) => {
        if (isAnimating.current || !swiperRef.current) {
            return;
        }
        lastDrag.current = null;
        startAnimation();
        if (direction === 'left') swiperRef.current.swipeLeft();
        else if (direction === 'right') swiperRef.current.swipeRight();
        else swiperRef.current.swipeTop();
    };

    const undoLastAction = () => {
        if (!session || !swiperRef.current || isAnimating.current) {
            return;
        }
        const entry = session.undo();
        if (!entry) {
            return;
        }
        tapFeedback();
        session.scheduleSave();
        if (!entry.previous) recordReviewed(-1);
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

    const startOver = () => {
        swipeBackDepth.current = 0;
        swiperRef.current?.jumpToCardIndex(0);
        setCurrentIndex(0);
    };

    const openReview = () => {
        session?.flush();
        router.push({
            pathname: '/review/[screenKeyType]/[screenKey]',
            params: { screenKeyType, screenKey: swipeKey },
        });
    };

    const openViewer = useCallback((item: AssetType) => {
        router.push({
            pathname: '/viewer',
            params: { uri: item.uri, mediaType: item.mediaType },
        });
    }, []);

    const overlayLabels = useMemo(
        () => ({
            // Labels sit on the opposite corner from the drag direction
            left: {
                element: <Stamp text="DELETE" color={colors.danger} />,
                style: { wrapper: labelWrapper('flex-end', 'flex-start') },
            },
            right: {
                element: <Stamp text="KEEP" color={colors.success} />,
                style: { wrapper: labelWrapper('flex-start', 'flex-start') },
            },
            top: {
                element: <Stamp text="SKIP" color={colors.primary} />,
                style: { wrapper: labelWrapper('center', 'center') },
            },
        }),
        [colors.danger, colors.success, colors.primary]
    );

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
        // The end-of-deck summary is drawn over the deck, so this is a spacer
        if (!item || item.uri === END_CARD_URI) return <View />;
        return (
            <SwipeCard
                item={item}
                index={index}
                totalCount={mediaAssets.length}
                isActive={isFocused && index === currentIndex}
                onOpen={openViewer}
            />
        );
    };

    const onAreaLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setArea((prev) =>
            prev && prev.width === width && prev.height === height
                ? prev
                : { width, height }
        );
    };

    if (loadError) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-center font-rubik text-muted">
                    Couldn't load your progress.
                </Text>
            </View>
        );
    }

    if (!session) {
        return <Spinner />;
    }

    const controlsDisabled = isAtEnd;

    return (
        <View className="flex-1">
            <ProgressHeader reviewed={reviewed} total={mediaAssets.length} />
            <View className="flex-1" onLayout={onAreaLayout}>
                {area && (
                    <Swiper
                        key={deckId}
                        ref={swiperRef}
                        containerStyle={{ backgroundColor: 'transparent' }}
                        cardStyle={{
                            top: CARD_MARGIN_TOP,
                            left: CARD_MARGIN_X,
                            width: area.width - CARD_MARGIN_X * 2,
                            height:
                                area.height -
                                CARD_MARGIN_TOP -
                                CARD_MARGIN_BOTTOM,
                        }}
                        cards={cards}
                        cardIndex={startIndex}
                        stackSize={Math.min(2, cards.length)}
                        disableBottomSwipe
                        disableTopSwipe={isAtEnd}
                        disableLeftSwipe={isAtEnd}
                        disableRightSwipe={isAtEnd}
                        onSwipedLeft={(cardIndex) =>
                            handleSwiped(SwipeActionType.DELETE, cardIndex)
                        }
                        onSwipedRight={(cardIndex) =>
                            handleSwiped(SwipeActionType.KEEP, cardIndex)
                        }
                        onSwipedTop={(cardIndex) =>
                            handleSwiped(SwipeActionType.SKIP, cardIndex)
                        }
                        // Fires after every completed swipe and swipe-back
                        onSwiped={endAnimation}
                        onSwiping={(x: number, y: number) => {
                            lastDrag.current = { x, y };
                        }}
                        onSwipedAborted={() => {
                            lastDrag.current = null;
                            endAnimation();
                        }}
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
                )}
                {isAtEnd && area && (
                    <View
                        className="absolute"
                        style={{
                            top: CARD_MARGIN_TOP,
                            left: CARD_MARGIN_X,
                            width: area.width - CARD_MARGIN_X * 2,
                            height:
                                area.height -
                                CARD_MARGIN_TOP -
                                CARD_MARGIN_BOTTOM,
                        }}
                    >
                        <EndSummary
                            kept={keepCount}
                            skipped={skipCount}
                            marked={pendingDeletes.length}
                            onReview={openReview}
                            onStartOver={startOver}
                        />
                    </View>
                )}
            </View>
            <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
                {pendingDeletes.length > 0 && (
                    <View className="mb-3">
                        <ReviewPill
                            count={pendingDeletes.length}
                            onPress={openReview}
                            disabled={false}
                        />
                    </View>
                )}
                <View className="flex-row items-start justify-evenly px-2">
                    <ActionButton
                        label="Undo"
                        icon="undo"
                        tone="muted"
                        size={52}
                        disabled={!canUndo}
                        onPress={undoLastAction}
                    />
                    <ActionButton
                        label="Delete"
                        icon="delete"
                        tone="danger"
                        disabled={controlsDisabled}
                        onPress={() => swipeWithButton('left')}
                    />
                    <ActionButton
                        label="Skip"
                        icon="skip-next"
                        tone="primary"
                        size={52}
                        disabled={controlsDisabled}
                        onPress={() => swipeWithButton('top')}
                    />
                    <ActionButton
                        label="Keep"
                        icon="check"
                        tone="success"
                        disabled={controlsDisabled}
                        onPress={() => swipeWithButton('right')}
                    />
                </View>
            </View>
        </View>
    );
};

export default SwiperDeck;
