/**
 * THE WRC SERVER — empty until there is one.
 *
 * Everything in the app works without it: documents, requests and profiles all
 * live on the phone. What a server adds is delivery to the WRC team — the
 * documents a person chooses to share, and every request they send (a Diamond
 * upgrade, a Request Centre form).
 *
 * Until this is set, those wait on the phone marked `queued`, and the app says
 * nothing about sharing — there is nothing to share with yet. Setting it is the
 * whole switch: src/data/sync/outbox.ts starts posting to
 *
 *   POST {SERVER_URL}/documents   multipart: `file` + `record` (JSON)
 *   POST {SERVER_URL}/requests    JSON: the request record
 *
 * and the upload sheet starts offering "Send a copy to the WRC team".
 *
 * Example: export const SERVER_URL: string = 'https://api.wealthrebuildcircle.in'
 */
export const SERVER_URL: string = ''

export function hasServer(): boolean {
  return SERVER_URL.trim() !== ''
}
