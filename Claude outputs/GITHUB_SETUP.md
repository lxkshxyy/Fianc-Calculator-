# Building the APK on GitHub — no Android Studio

Android Studio wants about 8 GB. This route uses none of it: GitHub builds the
app on their computers and hands you a finished `.apk` to download, on any
device including the phone itself.

What it costs you locally: **Git, about 300 MB** — and only if you do not already
have it.

---

## What GitHub actually is

Two things wearing one name:

1. **A place to store code.** Your project lives there as well as on your D:
   drive, with every version kept. If your laptop dies, the project does not.
2. **Computers you can borrow.** This is the part we want. A file in your project
   (`.github/workflows/android.yml` — already written) tells GitHub: *when I send
   you new code, install Java and the Android SDK, build the APK, and put the
   file where I can download it.* Their machines do the 8 GB of work.

Free accounts get 2,000 minutes of this per month. Each build here takes about
five. You will not run out.

The vocabulary, once:

| Word | What it means |
|---|---|
| **repository** (repo) | One project's folder on GitHub |
| **commit** | A saved snapshot of your changes, with a note about what changed |
| **push** | Send your commits up to GitHub |
| **workflow** / **action** | The build recipe GitHub runs for you |
| **release** | A page holding finished files — where your APK will land |

---

## Step 0 — put the build recipe where GitHub looks for it

The recipe is written, but it had to be delivered to your folder as
`github-workflow-android.yml` at the top level — Windows will not let me write
into a `.github` folder from here. Move it into place, once, in Command Prompt
from `D:\Loan App`:

```
mkdir .github\workflows
move github-workflow-android.yml .github\workflows\android.yml
```

The path has to be exactly `.github\workflows\android.yml`. GitHub looks there
and nowhere else; a file in the wrong place is silently ignored, which shows up
later as an empty Actions tab.

Check it landed:

```
dir .github\workflows
```

---

## Step 1 — do you already have Git?

In Command Prompt:

```
git --version
```

If it prints a version number, skip to step 2.

If it says it is not recognised, install it from https://git-scm.com/download/win.
Accept every default in the installer. **Close and reopen the terminal** when it
finishes, or it will still say the same thing.

## Step 2 — a GitHub account

Sign up at https://github.com. Free is all you need.

## Step 3 — an empty repository

1. github.com → the **+** at the top right → **New repository**
2. Name: `prosperitypath` (any name works)
3. **Choose Private.** This is client work.
4. Add **nothing** else — no README, no .gitignore, no licence. The page must
   say the repository is empty when it is created, or the first push is refused.
5. **Create repository**

Leave that page open. It shows a URL like
`https://github.com/yourname/prosperitypath.git` — you need it in a moment.

## Step 4 — send the project up

In Command Prompt, from `D:\Loan App`. Set your name and email first; Git
refuses to make a commit without knowing who made it:

```
git config --global user.name "Your Name"
git config --global user.email "the email you signed up with"
```

Then, once:

```
git init
git add .
git commit -m "ProsperityPath Android app"
git branch -M main
git remote add origin PASTE_YOUR_URL_HERE
git push -u origin main
```

On `git push` a browser window opens asking you to sign in to GitHub. Sign in
there and it remembers you. **Type no password into the terminal** — Git handles
it through the browser, which is both easier and safer.

`node_modules` is not uploaded; `.gitignore` already excludes it. The upload is
a few MB, not a few hundred.

## Step 5 — watch it build

Open your repository → the **Actions** tab. A run called *Build Android APK*
started the moment your code arrived. Click it to watch each step.

It runs your typecheck, lint and 283 tests first, then builds the APK. If a test
fails the build stops there and tells you which one — better than finding out
after six minutes of Android build.

## Step 6 — get the APK on your phone

When the run finishes, go to the repository's main page and look at
**Releases** on the right. There is one called **Latest build** with a file like
`prosperitypath-a1b2c3d.apk`.

**Open that release page on your phone** and tap the `.apk`. Android asks once
for permission to install from this source — allow it, and the app installs.

> Bookmark the release page on the phone. It always holds the newest build, so
> after any future change you just reopen it and tap.

Signed in on the phone, a private repository works normally in the browser.

---

## Every time you change something after this

Three commands:

```
git add .
git commit -m "what you changed"
git push
```

The build starts by itself. A few minutes later the release page has a new APK.

You can also start a build without changing anything: **Actions** tab → *Build
Android APK* → **Run workflow**.

---

## When something goes wrong

**"failed to push some refs"** — the repository was not empty. Delete it on
GitHub and make a new one with nothing added, or run `git pull --rebase origin
main` and push again.

**"Author identity unknown"** — the two `git config` lines in step 4 were
skipped.

**The Actions tab is empty** — `.github/workflows/android.yml` did not upload.
Check it exists in `D:\Loan App\.github\workflows\`, then `git add .`,
`git commit -m "add workflow"`, `git push`.

**A red X on the run** — click it and open the step that failed. The error is
the last few lines. Paste those to me and I will fix it.

**"App not installed"** on the phone — usually an older copy of the same app is
already there. Uninstall it first.

---

## Windows note

Every `npm` and `npx` command needs `.cmd` on this machine — `npm.cmd`,
`npx.cmd`. `git` is a normal program and does not.
