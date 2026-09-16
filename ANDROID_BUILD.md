# Wealth Rebuild Circle — native Android app

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

> **Short on disk?** `GITHUB_SETUP.md` builds the APK on GitHub's computers
> instead. It needs about 300 MB locally rather than 8 GB, and hands you a file
> you can install straight from the phone. Everything below is the local route.

## Prerequisites — Android Studio

Two things are needed to build an Android app: a Java runtime and the Android
SDK. Android Studio installs both, plus an emulator, in one go.

**Budget around 8 GB of free disk** — roughly 1 GB for the installer and another
6-7 GB once the SDK is downloaded.

1. Download from https://developer.android.com/studio and run the installer.
   Accept the defaults.
2. On first launch a Setup Wizard appears. Choose **Standard**, accept the
   licences, and let it download the SDK. This is the slow part — leave it be.
3. When it finishes, close Android Studio.

### If the terminal still says "JAVA_HOME is not set"

Android Studio keeps its Java to itself; it does not put it on your system PATH.
Building *inside* Android Studio works either way, but `npm.cmd run android:apk`
from a terminal needs to be told where Java is:

1. Confirm the folder exists: `C:\Program Files\Android\Android Studio\jbr`
2. Windows key → type "environment variables" → **Edit the system environment
   variables** → **Environment Variables…**
3. Under *User variables* → **New**
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Android\Android Studio\jbr`
4. **Open a new terminal** — an existing one keeps the old environment. Check
   with `java -version`.

---

## One-time setup

From `D:\Loan App`, in **Command Prompt** (not PowerShell — see the note at the
bottom):

```
npm.cmd install
npm.cmd run android:add
npm.cmd run android:assets
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
npm.cmd run android:sync
```

That builds the web bundle and copies it into the Android project. Run it after
any code change, or the app will still show the previous version.

---

## Getting it onto your phone

### Through Android Studio (recommended the first time)

```
npm.cmd run android:open
```

Android Studio opens the project. Plug the phone in with USB debugging on, pick
it from the device dropdown, press Run. The app installs and launches.

**Turning on USB debugging**, which Android hides by default:

1. Settings → About phone
2. Tap **Build number** seven times. It will tell you you are now a developer.
3. Back → System → **Developer options** → turn on **USB debugging**
4. Plug the phone in. A dialog appears on the phone asking to allow this
   computer — tap **Allow**. If no dialog appears, unplug and replug.

> The first Gradle sync inside Android Studio takes several minutes and looks
> frozen. It is downloading Gradle and the build tools. Let it finish once and
> every build after it is fast.

### As an APK file you can send to anyone

```
npm.cmd run android:apk
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

## If a screen says "Failed to fetch dynamically imported module"

This is a dev-server problem, not a broken screen, and it appears right after the
dependency list changes — which is exactly what adding Capacitor did.

Vite pre-bundles dependencies into `node_modules/.vite/deps/` and stamps each one
with a version hash. Change the dependencies and those hashes change. A browser
tab opened *before* the change is still holding the old ones, so every screen you
had already visited keeps working from memory while every screen you had not
fails the moment you click it. Half the tabs work, half do not.

The fix, in order:

```
(Ctrl+C to stop the dev server)
npm.cmd install
rmdir /s /q node_modules\.vite
npm.cmd run dev
```

Then hard-refresh the browser with **Ctrl+Shift+R** — a plain refresh reuses the
same stale module graph.

`npm install` is the step that gets skipped. Without it the new packages are
listed in `package.json` but are not on disk.

---

## Why every command says `npm.cmd`

PowerShell refuses to run `npm` and `npx` on this machine — they are PowerShell
scripts, and the execution policy blocks them. `npm.cmd` and `npx.cmd` are the
batch versions of the same tools, which the policy does not touch. Same npm, same
result, no settings changed.

So: `npm.cmd install`, never `npm install`. Inside an npm script it does not
matter — npm already runs those through cmd, which is why `cap`, `vite` and
`gradlew` need no suffix.

On macOS or Linux, drop the `.cmd`.

---

## Still works as a website

Nothing was removed. `npm run dev`, `npm run phone` and the tunnel flow in
`RUN_ON_PHONE.md` all behave exactly as before — the native code checks which
platform it is on and does nothing in a browser.
