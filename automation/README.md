# Diamond upgrade automation (n8n)

How a Silver member becomes Diamond without you touching a script:

```
Member taps "Request Diamond" in the app
   │  (the app posts the request to n8n: reference, name, login mobile, best time)
   ▼
n8n WhatsApps you ─────── if WhatsApp fails ──▶ SMS to you
   │
You call them, agree the plan, take the payment
   │
You reply on WhatsApp:  PAID WRC-DXXXXXX        (optionally: PAID WRC-DXXXXXX 4999)
   ▼
n8n makes their activation code and sends it to the member's mobile
   │   on WhatsApp ────── if that fails ──▶ by SMS
   ▼
You get ✅ with the code (⚠️ + the code to read out, if both channels failed)
Member types the code on Profile → Membership → Diamond opens
```

**Where does the code come from?** From the same secret that is in
`src/config/activation.json`. A code is an HMAC of the request reference, so it
only works for that one request. The app checks it on the phone; n8n makes it
with the exact same maths (tested against `scripts/diamond-code.mjs`). Nothing
is looked up in a database, and your website is not involved.

**Where is the member's number taken from?** From the request itself. The
request form is pre-filled with the mobile on the member's profile, and if the
profile had none, the number they enter is saved to it. That is the number the
code goes to.

**Where are requests kept?** In an n8n data table, `wrc_diamond_requests`
(n8n → Overview → Data tables). The workflow creates it by itself. Each row
shows the status (pending/paid), whether your alert went by WhatsApp or SMS,
the payment time, amount, code and how the code was delivered.

## Your WhatsApp commands

Send these to your WhatsApp Business number from an admin number (only numbers
in `adminNumbers` are obeyed):

| You send | What happens |
|---|---|
| `PAID WRC-D7K3P9Q` | Marks it paid, sends the code to the member, replies ✅ with the code |
| `PAID WRC-D7K3P9Q 4999` | Same, and records the amount |
| `RESEND WRC-D7K3P9Q` | Sends the code again (only once it is paid) |
| `PENDING` | Lists open requests |
| anything else | Shows this list |

Lower case, no dash, or a missing `WRC-` all work (`paid d7k3p9q`). O and 0,
I/L and 1 are treated alike, as in the app.

## One-time setup

You need: Docker Desktop (already on your PC), a free ngrok account, a Meta
developer account, and optionally a Fast2SMS account for the SMS fallback.

### 1. Start n8n with a public address

1. [ngrok.com](https://ngrok.com) → sign up → **Your Authtoken**, and
   **Domains** → claim your free static domain (e.g. `wrc-admin.ngrok-free.app`).
2. In `automation/n8n`, copy `.env.example` to `.env` and fill in both values.
3. In that folder: `docker compose up -d`
4. Open http://localhost:5678, create your n8n owner account.

Check: `https://<your-domain>/healthz` in a browser says `{"status":"ok"}`.

### 2. WhatsApp Cloud API (Meta)

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps →
   Create app** → use case *Connect with customers through WhatsApp* (Business).
2. **WhatsApp → API Setup**: note the **Phone number ID**. For the demo use the
   free test number; under **To**, add and verify `+91 87448 55792` and any
   phone you will test the customer side with (up to 5 numbers).
3. **App settings → Basic → App secret** → Show → copy.
4. A token that does not expire: business.facebook.com → **Business settings →
   System users** → add one (Admin) → **Assign assets**: your app and WhatsApp
   account (full control) → **Generate token** with
   `whatsapp_business_messaging` and `whatsapp_business_management`, expiry
   *Never*. (The token on API Setup works for testing but lasts 24 hours.)
5. **Message templates** (WhatsApp Manager → Message templates → Create). Both
   **Utility**, language **English** (`en`):

   `wrc_diamond_request`
   ```
   💎 New Diamond request {{1}}
   Name: {{2}}
   Mobile: {{3}}
   Best time: {{4}}

   After payment, reply PAID {{5}} to send their code.
   ```
   `wrc_diamond_code`
   ```
   Hi {{1}}, your payment is confirmed. Your WRC Diamond activation code is {{2}} (request {{3}}). Open the WRC app → Profile → Membership and enter this code.
   ```
   Give sample values when asked (e.g. `WRC-D7K3P9Q`, `Asha`, `+91 98765 43210`,
   `Evening`, `F1PQ-E9AS`). Approval usually takes minutes.

### 3. Import the workflow

1. n8n → **Workflows → Import from file** → `WRC-Diamond-Automation.json`.
2. Open the **Settings** node and fill in `phoneNumberId`, `accessToken`,
   `appSecret` (and `sms.apiKey` if you have one). Everything else is already
   set: your number `918744855792`, the app key, the activation secret and the
   verify token.
3. **Publish** (activate) the workflow.

### 4. Point Meta at n8n

WhatsApp → **Configuration → Webhook → Edit**:

- Callback URL: `https://<your-domain>/webhook/wrc/whatsapp`
- Verify token: `wrc-verify-re2m0q5g2pjd822r` (from the Settings node)
- **Verify and save**, then **Webhook fields → Manage → messages → Subscribe**.

### 5. Point the app at n8n

In `src/config/automation.ts` set

```ts
export const DIAMOND_WEBHOOK_URL: string =
  'https://<your-domain>/webhook/wrc/diamond-request'
```

commit and push — GitHub Actions builds the new APK.

### 6. SMS fallback (optional)

[fast2sms.com](https://www.fast2sms.com) → sign up, recharge ₹100 and complete
KYC (their rule for API access) → **Dev API** → copy the API key into
`sms.apiKey`. The workflow uses the *Quick SMS* route, which needs no DLT
registration and costs about ₹5 per SMS. To use another provider, change the
three `SMS ·` nodes.

## Test it

1. On a phone with the APK, sign in, put a test mobile on Profile, then
   Profile → Membership → **Upgrade to Diamond → Request Diamond**.
2. Within seconds you get the 💎 WhatsApp. The app shows *Request sent*.
3. Reply `PAID WRC-…`. The test phone gets the code; you get ✅.
4. Type the code on the test phone → Diamond.

## Good to know

- **Your PC must be on** for n8n to run. While it is off, the app keeps the
  request on the phone and sends it the next time it is opened online, and Meta
  keeps re-delivering your PAID replies for a while.
- **Before your templates are approved** you can set `useTemplates: false`.
  Plain messages then work, but only to a number that messaged your WhatsApp
  Business number in the last 24 hours — fine for a first demo: send "hi" to
  the test number from your phone first.
- **Replies to you** (✅, lists, help) are plain messages; they are free because
  you have just messaged the number.
- **Security**: n8n only acts on WhatsApp messages signed by Meta with your app
  secret, and only on commands from `adminNumbers`. The app's requests carry the
  app key. Keep the workflow private once the token is in it.
- **Load**: tested with 300 requests arriving 25 at a time — all stored once,
  one alert each, about 9 requests a second on a laptop-class machine; a single
  request is answered in about 120 ms.
