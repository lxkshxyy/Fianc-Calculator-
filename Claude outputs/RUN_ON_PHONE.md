# Running ProsperityPath on your phone

There are two different things here, and mixing them up is what makes it look
broken. **Viewing** the app on your phone is easy. **Installing** it as an app —
own icon, own window, works offline — needs one extra thing: a secure (https)
address. A phone will not install an app served from a plain `http://192.168.x.x`
address, no matter what the code does.

---

## 1. Just look at it on the phone (fastest, 10 seconds)

```
npm run dev:mobile
```

Scan the QR in the terminal. If Chrome shows
**"This site doesn't support a secure connection"** — tap **Continue to site**.
That warning is Chrome's *Always use secure connections* setting, not a fault in
the app. To stop it appearing every time:

> Chrome → ⋮ → Settings → Privacy and security → Always use secure connections → **off**

What you get: the real screens, real data, real touch behaviour.
What you do **not** get: the install prompt, the home-screen icon, or offline
mode. Those need step 2.

---

## 2. Install it as a real app (https, ~2 minutes)

The install prompt only appears when two things are true: the address is https,
and a service worker is running. `npm run dev` deliberately never registers a
service worker — a cached shell during development hides the edit you just made —
so this has to be the **production build**, served through a tunnel.

**Terminal 1** — build and serve the real thing:

```
npm run phone
```

That runs the build, then serves it on port **4173** on your network.

**Terminal 2** — put an https address in front of it:

```
npx.cmd cloudflared tunnel --url http://localhost:4173
```

It prints a URL like `https://something-random.trycloudflare.com`. That address
is real https with a real certificate, which is the whole point — a self-signed
certificate will not do, because Chrome refuses to register a service worker on
any page with a certificate warning.

To get that URL onto the phone without typing it:

```
npx.cmd qrcode-terminal https://something-random.trycloudflare.com
```

Open it on the phone, then **⋮ → Add to Home screen** (or Chrome offers
*Install app* on its own after a few seconds).

Now: own icon, no browser bar, and it still opens with the aeroplane mode on.

> The tunnel URL changes every time you restart it, and dies when you close the
> terminal. That is fine for testing. For an address that stays put, deploy the
> `dist/` folder to any static host — the installed app behaves identically.

---

## 3. "But I want a real app, not a website"

Worth being straight about this: what we built is a **PWA**. Installed, it has
its own icon, its own window with no browser chrome, and it works offline — it
behaves like an app and your phone lists it as one. Under the hood it still runs
on the phone's browser engine. That is true of an installed PWA everywhere, and
it is not something a code change fixes.

If you later want a `.apk` on the Play Store, the normal route is to wrap this
exact build — nothing gets rewritten:

- **TWA / Bubblewrap** — thinnest wrapper, literally ships this PWA as an APK.
- **Capacitor** — heavier, but opens the door to native things a browser cannot
  do (contacts, background sync, biometric unlock).

Both need a Google Play developer account (one-off fee) and a hosted https URL,
so they belong after the app is finished, not now.

---

## Script reference

| Command | What it does |
|---|---|
| `npm run dev` | Dev server, this machine only |
| `npm run dev:mobile` | Dev server on the network + QR code |
| `npm run dev:tunnel` | Dev server with hot reload pointed at a tunnel's port 443 |
| `npm run phone` | Build, then serve the production app on the network (port 4173) |
| `npm run preview:mobile` | Serve an existing build on the network, no rebuild |

## Windows note

If PowerShell refuses with *"running scripts is disabled on this system"*, use
`npm.cmd` / `npx.cmd` instead of `npm` / `npx`, or run the commands from Command
Prompt rather than PowerShell.
