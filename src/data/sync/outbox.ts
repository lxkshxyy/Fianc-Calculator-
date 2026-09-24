import { hasServer, SERVER_URL } from '@/config/server'
import { repo } from '../repo'

/**
 * Hands queued records to the WRC server — the one place the app talks to it.
 *
 * Called when the app opens and after anything is queued. With no server
 * configured it returns at once; with one, it sends what is waiting and marks
 * each record `sent` only after the server has accepted it, so a dropped
 * connection means "try again next time", never "lost".
 *
 * It never throws. Delivery is a background courtesy — a failure here must not
 * surface as an error on whatever screen the person happens to be on.
 */
export async function deliverQueued(): Promise<number> {
  if (!hasServer()) return 0
  const base = SERVER_URL.replace(/\/+$/, '')
  let sent = 0

  try {
    const snapshot = await repo.read()

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
      if (record.delivery !== 'queued') continue
      const response = await fetch(`${base}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      if (!response.ok) continue
      await repo.update('requests', record.id, { delivery: 'sent' })
      sent += 1
    }
  } catch (error) {
    console.warn('Could not reach the WRC server; queued records will be retried.', error)
  }

  return sent
}
