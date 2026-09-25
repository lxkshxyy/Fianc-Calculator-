import { CapacitorHttp } from '@capacitor/core'

import { AUTOMATION_KEY, DIAMOND_WEBHOOK_URL, hasAutomation } from '@/config/automation'
import { hasServer, SERVER_URL } from '@/config/server'
import { isNativeApp } from '@/native/platform'
import type { RequestTicket } from '../schema'
import { repo } from '../repo'

/**
 * Hands queued records to whoever takes them — the one place the app talks to
 * the outside world.
 *
 *   - Diamond requests go to the automation (config/automation.ts), which
 *     WhatsApps the WRC team and later sends the member their code.
 *   - Everything else queued — shared documents, Request Centre forms — goes to
 *     the WRC server (config/server.ts).
 *
 * Called when the app opens, when the phone comes back online, and after
 * anything is queued. With nowhere to send it returns at once; otherwise it
 * sends what is waiting and marks each record `sent` only after it has been
 * accepted, so a dropped connection means "try again next time", never "lost".
 *
 * It never throws. Delivery is a background courtesy — a failure here must not
 * surface as an error on whatever screen the person happens to be on.
 */

let inFlight: Promise<number> | null = null
let again = false

/**
 * One delivery pass at a time. A call that arrives mid-pass (a request saved
 * while the app is still delivering from its launch) asks for one more pass
 * rather than starting a second one — two passes would read the same queue and
 * post the same record twice.
 */
export function deliverQueued(): Promise<number> {
  if (inFlight !== null) {
    again = true
    return inFlight
  }
  inFlight = (async () => {
    let total = 0
    do {
      again = false
      total += await deliverOnce()
    } while (again)
    return total
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function deliverOnce(): Promise<number> {
  if (!hasServer() && !hasAutomation()) return 0
  let sent = 0

  try {
    const snapshot = await repo.read()
    const handled = new Set<string>()

    if (hasAutomation()) {
      for (const record of snapshot.requests) {
        if (record.delivery !== 'queued' || record.service !== 'diamond-upgrade') continue
        handled.add(record.id)
        if (!(await postJson(DIAMOND_WEBHOOK_URL.trim(), diamondPayload(record)))) continue
        await repo.update('requests', record.id, { delivery: 'sent' })
        sent += 1
      }
    }

    if (hasServer()) {
      const base = SERVER_URL.replace(/\/+$/, '')

      for (const record of snapshot.documents) {
        if (record.delivery !== 'queued') continue
        const body = new FormData()
        body.append('record', JSON.stringify(record))
        const file = record.fileId === null ? null : await repo.getFile(record.fileId)
        if (file !== null) body.append('file', file, record.name)
        const response = await fetch(`${base}/documents`, { method: 'POST', body })
        if (!response.ok) continue
        await repo.update('documents', record.id, { delivery: 'sent' })
        sent += 1
      }

      for (const record of snapshot.requests) {
        if (record.delivery !== 'queued' || handled.has(record.id)) continue
        const response = await fetch(`${base}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
        if (!response.ok) continue
        await repo.update('requests', record.id, { delivery: 'sent' })
        sent += 1
      }
    }
  } catch (error) {
    console.warn('Could not deliver queued records; they will be retried.', error)
  }

  return sent
}

/** What the automation needs to alert the team and, later, to reach the member. */
function diamondPayload(record: RequestTicket): Record<string, unknown> {
  const answer = (key: string): string =>
    typeof record.answers[key] === 'string' ? record.answers[key] : ''
  return {
    reference: record.reference,
    name: answer('name'),
    phone: answer('phone'),
    email: answer('email'),
    bestTime: answer('bestTime'),
    submittedAt: record.submittedAt,
    app: 'wrc',
  }
}

/**
 * POST JSON and report whether it was accepted.
 *
 * In the Android app this goes through Capacitor's native HTTP rather than the
 * WebView's fetch: no CORS preflight, and a tunnel such as ngrok sees an app
 * rather than a browser, so it does not answer with its "visit site?" page.
 */
async function postJson(url: string, body: Record<string, unknown>): Promise<boolean> {
  const headers = { 'Content-Type': 'application/json', 'X-WRC-Key': AUTOMATION_KEY }
  if (isNativeApp()) {
    const response = await CapacitorHttp.post({
      url,
      headers,
      data: body,
      connectTimeout: 15_000,
      readTimeout: 15_000,
    })
    return response.status >= 200 && response.status < 300
  }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  return response.ok
}
