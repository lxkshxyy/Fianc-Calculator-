# ProsperityPath — native Android app

The app is now an Android application. Same screens, same code, same 283 tests —
what changed is the shell it runs in. Instead of a browser tab it is a real
`.apk`: its own package id (`ai.prosperitypath.app`), its own launcher icon, its
own entry in the task switcher, and an install with no browser involved.

Nothing in `src/routes/`, `src/components/` or `src/domain/` was touched.

---

## What "native" means here, precisely

Worth being exact, because it decides whether this is what you wanted.

Capacitor gives you a genuine Android app. Android treats it as an app in every
way that matters: the launcher, permissions, notifications, the back gesture,
the Play Store. Inside that app, the screens are drawn by a WebView.

That is the same approach used by a lot of shipped Android apps, and it is the
only route that keeps your existing UI. The alternative — Jetpack Compose or
React Native — means rewriting all 24 screens, every chart, every form and the
whole storage layer. That would be a new app, not this one.

---

## Prerequisites

You need **Android Studio**. It bundles a matching JDK and the Android SDK, which
removes every "wrong Java version" problem before it starts.

Download: https://developer.android.com/studio

On first launch let it install the default SDK. That is all the setup required.

> If `java -version` already works in Command Prompt and you have the SDK, you can
> build from the command line instead — but Android Studio is the shorter road.

---

## One-time setup

From `D:\Loan App`, in **Command Prompt** (not PowerShell — see the note at the
bottom):

```
npm install
npm run android:add
npm run android:assets
```

- `android:add` creates the `android/` folder — a real Gradle project. It is
  generated, so it is fine for it to be large; you edit it only for things like
  permissions.
- `android:assets` turns `assets/icon.png` and `assets/splash.png` into every
  Android density, including the adaptive icon Android masks to the launcher's
  shape.

---

## Every time you change the app

```
npm run android:sync
```

That builds the web bundle and copies it into the Android project. Run it after
any code change, or the app will still show the previous version.

---

## Getting it onto your phone

### Through Android Studio (recommended the first time)

```
npm run android:open
```

Android Studio opens the project. Plug the phone in with USB debugging on, pick
it from the device dropdown, press Run. The app installs and launches.

> USB debugging: Settings → About phone → tap Build number seven times →
> back → Developer options → USB debugging.

### As an APK file you can send to anyone

```
npm run android:apk
```

The file lands at:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

Copy it to the phone however you like and open it. Android will ask you to allow
installing from that source once. This is a **debug** APK — perfect for testing
and for showing a client, not for the Play Store.

---

## What the native shell actually does

Five things, all in `src/native/`, all inert in the web build:

| | |
|---|---|
| **Back button** | `backButton.ts` — Android's back closes an open sheet first, then goes back one screen, and only exits from the dashboard. Without this, back closes the app from anywhere, which is the single most obvious "this is just a website" tell. |
| **Status bar** | `shell.ts` — coloured to match the app and follows your light/dark toggle, including `system`. |
| **Splash screen** | Held until React has actually painted, so there is no white flash and no splash sitting over a ready app. |
| **Keyboard** | Android resizes the window itself, so the quick-add bar stays above the keyboard. |
| **Launch route** | `entry.ts` — opens on the dashboard, not the public landing page. Signed out, the existing §6 guard sends you to `/auth` and back to the dashboard afterwards. |

The service worker is **not** registered in the Android build. Every asset is
already inside the APK, so a second cache layer adds nothing and can serve a
stale bundle after an update. The web build still registers it.

---

## Before the Play Store

Not needed for testing, listed so it is not a surprise later:

1. **A signing key.** A release APK must be signed with a keystore you generate
   and keep — lose it and you cannot update your own app. Android Studio:
   Build → Generate Signed Bundle / APK.
2. **An `.aab`, not an `.apk`.** Play requires the App Bundle format.
3. **A privacy policy URL.** Mandatory for anything handling financial data.
4. **A Play Console account** — one-time fee.
5. **Data safety declaration.** Straightforward here: everything stays on the
   device, nothing is sent anywhere.

---

## Replace the icon when branding is final

`assets/icon.png` and `assets/splash.png` were generated from the existing PWA
icon, upscaled. They are fine for testing and will look soft next to a proper
export. When the real mark exists, drop in a 1024×1024 `assets/icon.png` and
re-run `npm run android:assets`.

---

## Windows note

If PowerShell says *"running scripts is disabled on this system"*, use Command
Prompt, or `npm.cmd` / `npx.cmd` instead of `npm` / `npx`.

---

## Still works as a website

Nothing was removed. `npm run dev`, `npm run phone` and the tunnel flow in
`RUN_ON_PHONE.md` all behave exactly as before — the native code checks which
platform it is on and does nothing in a browser.
