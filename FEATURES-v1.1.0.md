# sWipe v1.1.0 — Feature Spec (for reasonix)

Repo: `C:\Users\PC\sWipe-build` (Expo SDK 52, expo-router, TypeScript, NativeWind)
Current HEAD: `abfb403` (v1.0.1). App name in code: swipetrash / sWipe.
Do NOT touch: android/ build config, app.json version (Hermes bumps it after review).

## Feature list (all user-requested, 2026-08-15)

### 1. Settings screen (currently a placeholder)
`app/(root)/settings/index.tsx` is `<Text>index</Text>`. Build a real settings UI with:
- **Autoplay videos** — Switch toggle, default ON (matches current behavior: active video plays)
- **Swipe-up action** — picker with options:
  - `Off` (default — current behavior, top swipe disabled)
  - `Move to Favorites` (add asset to a "Favorites" album, create if missing)
  - `Move to custom folder` (add asset to a user-named album; show a TextInput for the folder name when selected)
- Persist via AsyncStorage (`@react-native-async-storage/async-storage` — already a dep). Keys: `settings.autoplayVideos`, `settings.swipeUpAction` ('off'|'favorites'|'custom'), `settings.customFolderName`.
- Settings must be readable from the swipe deck + card: create a small settings module (e.g. `common/lib/settings/SettingsStore.ts`) with load/save + a React hook (useState + useEffect on mount + update fn). Root layout (`app/_layout.tsx`) wraps a provider OR the deck loads settings on mount — your choice, keep it simple and typed.

### 2. One-click fullscreen for images (and exit)
- Tapping the **image itself** on the swipe card enters fullscreen. Tapping again (or a close X) exits.
- Fullscreen = full-screen `Modal` (RN Modal, transparent=false, black bg). Modal captures all touches → **deck swipes cannot fire while fullscreen** (satisfies: swiping left/right in fullscreen must NOT trigger delete/keep).
- **Pinch-to-zoom ONLY** — no double-tap zoom. Use `react-native-gesture-handler` `Gesture.Pinch()` + `Gesture.Pan()` composed with reanimated shared values (both libs already installed; pattern: Gesture.Simultaneous(pinch, pan), clamp scale 1..5, pan only meaningful when scale > 1). Single finger drag when zoomed pans the image.
- The existing fullscreen icon button (top-left of card, currently `console.log('View Full Screen')` stub) must also open the same fullscreen viewer.
- Metadata/info button behavior unchanged.

### 3. Fullscreen for videos (fix — currently broken)
- The stub button must open the video in the same fullscreen Modal: video centered, plays on mount (looping), black background.
- **Audio toggle button** in fullscreen: speaker icon (bottom-right). **Disabled (muted) by default.** Tapping enables sound; state must persist across cards for the current app session (lift to SwiperDeck state or module-level session store — NOT AsyncStorage; resets on app restart).
- Close X (top-right) exits fullscreen.

### 4. Audio toggle on the video card (session-persistent)
- `components/swipe/swipe-card.tsx` currently hardcodes `isMuted` on the expo-av Video. Replace with session state from the deck (default muted). Add a small speaker-on/off button on the video card (e.g. top-right next to info, or bottom-left) that toggles audio. Same session state as #3 — toggling in either place reflects in the other.
- Autoplay setting from #1 gates `shouldPlay` on the active card (ON: current behavior `shouldPlay={!isPaused}`; OFF: video shows play icon / doesn't start until tapped — tap video to play).

### 5. Configurable swipe-up action
- `components/swipe/swiper-deck.tsx` currently passes `disableTopSwipe` + `disableBottomSwipe`. Remove `disableTopSwipe` (keep bottom disabled).
- Add `onSwipedTop` handler → performs the configured action from settings:
  - `off`: re-enable `disableTopSwipe` at render time (deck never accepts top swipes)
  - `favorites`: `MediaLibrary.createAlbumAsync('Favorites')` if missing, then `addAssetsToAlbumAsync([asset], albumId)` — then record the action as **KEEP** (same as right-swipe: `handleAction(SwipeActionType.KEEP, asset, index)` + insert TO_KEEP in trie) so the card leaves the deck and counts as kept. If the asset has an `albumId` different from the target album, `removeAssetsFromAlbumAsync` from the source album (true move).
  - `custom`: same as favorites but album name = `settings.customFolderName` (create if missing). If name is empty, fall back to KEEP without any album operation (no crash).
- Swipe-up overlay label: add a `top` entry to `overlayLabel` (e.g. title 'Favorite' / 'Move', color blue/amber) — only when an action other than 'off' is configured. react-native-deck-swiper shows overlay per direction.
- Keep `onSwipedLeft` (DELETE) and `onSwipedRight` (KEEP) exactly as-is.

## Acceptance criteria
- `npx tsc --noEmit` (or expo lint) passes.
- Settings values persist across app restarts (AsyncStorage).
- Audio state resets on app restart but survives card→card and deck→deck during a session.
- Fullscreen: pinch zoom + pan works; left/right swipes never delete/keep; close returns to same deck state (index unchanged).
- Swipe-up with favorites/custom: asset appears in the target album; card removed from deck and counted as kept.
- No new npm dependencies (all needed libs are installed).

## Files you'll likely touch
- `app/(root)/settings/index.tsx` — real UI
- `common/lib/settings/SettingsStore.ts` — NEW: AsyncStorage-backed settings + hook
- `app/_layout.tsx` — provider wrap (if you go context route)
- `components/swipe/swipe-card.tsx` — tap-to-fullscreen, audio button, autoplay gating, fullscreen stub fix
- `components/swipe/swiper-deck.tsx` — top-swipe enable + handler, session audio state, overlay label
- NEW: `components/swipe/fullscreen-viewer.tsx` (or similar) — shared fullscreen Modal (image pinch/pan + video + audio toggle + close)

Keep changes surgical — don't refactor anything unrelated (localStorage trie, deck reload, confirmation panel all work; leave them alone).
