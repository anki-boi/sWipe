# sWipe – Smart & Fun Media Cleanup

sWipe is an open-source media management app designed to help users declutter their photo and video library effortlessly. Instead of aimlessly scrolling through social media, sWipe lets you **scroll with purpose**—cleaning up your gallery with intuitive swipe gestures.

## Features

- [x] **Swipe-Based Sorting**
- **Swipe Left → Trash**: Marks media for deletion; nothing is deleted until you confirm.
- **Swipe Right → Keep**: Retains media in the gallery.

- [x] **Free & Open Source**
- No locked features, no subscriptions
- Privacy Focussed


## Future Improvements

- [ ] **Daily Cleanup Goals**
- - Helps users declutter in small, manageable steps instead of overwhelming them.

- [ ] **Smart Insights & Stats**
- - Tracks photo-taking habits and **generates a heatmap** of media activity.
- - Provides insights into how frequently users capture photos and videos.

- [ ] Publish on fdroid

- [ ] Add WebDAV support
- - We are eager to add WebDAV support so you can cleanup media in remote web directories like NextCloud

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
