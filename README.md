# sWipe – Smart & Fun Media Cleanup

sWipe is an open-source media management app designed to help users declutter their photo and video library effortlessly. Instead of aimlessly scrolling through social media, sWipe lets you **scroll with purpose**—cleaning up your gallery with intuitive swipe gestures.

## Features

- [x] **Swipe-Based Sorting**
- - **Swipe Left → Delete**: Marks media for deletion; nothing is deleted until you confirm.
- - **Swipe Right → Keep**, **Swipe Up → Skip**, with undo.
- - Tap a card for a full-screen, zoomable view.

- [x] **Review before delete**
- - See everything you marked in a grid and un-mark anything before deleting.

- [x] **Smart filters**
- - Screenshots, Long videos, On this day and Oldest first, alongside months and albums.

- [x] **Daily Cleanup Goals**
- - A daily target with streaks, so you can declutter in small steps.

- [x] **Stats**
- - Space freed, items deleted, streaks and the last 7 days.

- [x] **Light & dark theme**, haptics, first-run intro

- [x] **Free & Open Source**
- - No locked features, no subscriptions
- - Privacy focused: everything stays on your device

## Future Improvements

- [ ] Publish on F-Droid

- [ ] Add WebDAV support
- - We are eager to add WebDAV support so you can clean up media in remote web directories like Nextcloud

- [ ] iOS Support

---

## Screenshots

---


### 🛠 Build from Source

#### Prerequisites

- [Bun](https://bun.sh) (or Node.js 20+)
- JDK 17
- Android Studio with the Android SDK (an emulator or a device with USB debugging)

sWipe is written in React Native and Expo and built for Android.

```
git clone https://github.com/madhavpcm/sWipe.git
cd sWipe
bun install
bun run android   # builds the dev client and installs it on the emulator/device
bun run start     # starts the Metro dev server
```

Alternatively, `./run.sh` builds a development APK locally with EAS.

#### Checks

```
bun run typecheck
bun run lint
bun run test
```

CI runs these plus an Android debug build on every pull request.

#### Release builds

Release builds are signed with your upload key when these Gradle properties or
environment variables are set; otherwise they fall back to the debug keystore,
which is **not** suitable for distribution:

| Variable | Description |
| --- | --- |
| `SWIPE_UPLOAD_STORE_FILE` | Path to the upload keystore |
| `SWIPE_UPLOAD_STORE_PASSWORD` | Keystore password |
| `SWIPE_UPLOAD_KEY_ALIAS` | Key alias |
| `SWIPE_UPLOAD_KEY_PASSWORD` | Key password |

#### How deleting works

Items you swipe left are only *marked* for deletion. When you confirm, Android
11+ shows its own system dialog listing the files; nothing is deleted until you
accept it. On Android 10 and below sWipe asks for confirmation in the app and
then deletes the files directly.

Swipe progress is stored only on the device.
