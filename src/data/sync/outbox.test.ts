import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * The server switch is a constant, so each case sets it through a mock before
 * the outbox is imported.
 */
const server = vi.hoisted(() => ({ url: '' }))
vi.mock('@/config/server', () => ({
  get SERVER_URL() {
    return server.url
  },
  hasServer: () => server.url !== '',
}))
const automation = vi.hoisted(() => ({ url: '' }))
vi.mock('@/config/automation', () => ({
  get DIAMOND_WEBHOOK_URL() {
    return automation.url
  },
  AUTOMATION_KEY: 'test-key',
  hasAutomation: () => automation.url !== '',
}))

import { repo } from '../repo'
import { deliverQueued } from './outbox'

describe('delivering to the WRC server', () => {
  beforeEach(async () => {
    await repo.clearEverything()
  })

  afterEach(() => {
    server.url = ''
    automation.url = ''
    vi.unstubAllGlobals()
  })

  it('does nothing, and calls nobody, while there is no server', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await repo.create('documents', {
      name: 'Policy',
      kind: 'insurance-policy',
      sizeBytes: 1,
      uploadedOn: '2026-01-01',
      tags: [],
      mimeType: 'application/pdf',
      fileId: null,
      scan: null,
      delivery: 'queued',
    })
    expect(await deliverQueued()).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends queued records, marks them sent, and leaves local ones alone', async () => {
    server.url = 'https://api.example.test/'
    const fetchSpy = vi.fn(() => Promise.resolve(new Response('{}', { status: 201 })))
    vi.stubGlobal('fetch', fetchSpy)

    await repo.putFile('file_a', new Blob(['%PDF']))
    const shared = await repo.create('documents', {
      name: 'Shared',
      kind: 'insurance-policy',
      sizeBytes: 4,
      uploadedOn: '2026-01-01',
      tags: [],
      mimeType: 'application/pdf',
      fileId: 'file_a',
      scan: null,
      delivery: 'queued',
    })
    const private_ = await repo.create('documents', {
      name: 'Private',
      kind: 'other',
      sizeBytes: 4,
      uploadedOn: '2026-01-01',
      tags: [],
      mimeType: 'application/pdf',
      fileId: null,
      scan: null,
      delivery: 'local',
    })
    await repo.create('requests', {
      reference: 'WRC-DAAAAAA',
      service: 'diamond-upgrade',
      status: 'submitted',
      submittedAt: 1,
      answers: { phone: '+91 98765 43210' },
      consentGivenAt: 1,
      delivery: 'queued',
    })

    expect(await deliverQueued()).toBe(2)
    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0]))
    expect(urls).toEqual([
      'https://api.example.test/documents',
      'https://api.example.test/requests',
    ])

    const snapshot = await repo.read()
    expect(snapshot.documents.find((d) => d.id === shared.id)?.delivery).toBe('sent')
    expect(snapshot.documents.find((d) => d.id === private_.id)?.delivery).toBe('local')
    expect(snapshot.requests[0]?.delivery).toBe('sent')
  })

  it('keeps a record queued when the server refuses it, to try again later', async () => {
    server.url = 'https://api.example.test'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 503 }))),
    )
    await repo.create('requests', {
      reference: 'WRC-DBBBBBB',
      service: 'diamond-upgrade',
      status: 'submitted',
      submittedAt: 1,
      answers: {},
      consentGivenAt: 1,
      delivery: 'queued',
    })
    expect(await deliverQueued()).toBe(0)
    expect((await repo.read()).requests[0]?.delivery).toBe('queued')
  })

  it('never throws when the network is down', async () => {
    server.url = 'https://api.example.test'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await repo.create('requests', {
      reference: 'WRC-DCCCCCC',
      service: 'diamond-upgrade',
      status: 'submitted',
      submittedAt: 1,
      answers: {},
      consentGivenAt: 1,
      delivery: 'queued',
    })
    await expect(deliverQueued()).resolves.toBe(0)
  })
})

describe('delivering Diamond requests to the automation', () => {
  const diamond = (reference: string, delivery: 'queued' | 'sent' = 'queued') =>
    repo.create('requests', {
      reference,
      service: 'diamond-upgrade',
      status: 'submitted',
      submittedAt: 1,
      answers: { name: 'Asha', phone: '+91 98765 43210', email: 'a@b.in', bestTime: 'evening' },
      consentGivenAt: 1,
      delivery,
    })

  beforeEach(async () => {
    await repo.clearEverything()
  })

  afterEach(() => {
    server.url = ''
    automation.url = ''
    vi.unstubAllGlobals()
  })

  it('posts the request with the app key and what the team needs, then marks it sent', async () => {
    automation.url = 'https://n8n.example.test/webhook/wrc/diamond-request'
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response('{"ok":true}', { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchSpy)
    await diamond('WRC-DAAAAAA')
    await diamond('WRC-DBBBBBB', 'sent')

    expect(await deliverQueued()).toBe(1)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('https://n8n.example.test/webhook/wrc/diamond-request')
    expect((init?.headers as Record<string, string>)['X-WRC-Key']).toBe('test-key')
    expect(JSON.parse(typeof init?.body === 'string' ? init.body : '{}')).toMatchObject({
      reference: 'WRC-DAAAAAA',
      name: 'Asha',
      phone: '+91 98765 43210',
      email: 'a@b.in',
      bestTime: 'evening',
    })
    const requests = (await repo.read()).requests
    expect(requests.every((request) => request.delivery === 'sent')).toBe(true)
  })

  it('keeps it queued when the automation is down, and sends it on the next try', async () => {
    automation.url = 'https://n8n.example.test/webhook/wrc/diamond-request'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await diamond('WRC-DCCCCCC')
    expect(await deliverQueued()).toBe(0)
    expect((await repo.read()).requests[0]?.delivery).toBe('queued')

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    )
    expect(await deliverQueued()).toBe(1)
    expect((await repo.read()).requests[0]?.delivery).toBe('sent')
  })

  it('sends Diamond requests to the automation and the rest to the server — never both', async () => {
    automation.url = 'https://n8n.example.test/hook'
    server.url = 'https://api.example.test'
    const fetchSpy = vi.fn<(url: string) => Promise<Response>>(() =>
      Promise.resolve(new Response('{}', { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchSpy)
    await diamond('WRC-DDDDDDD')
    await repo.create('requests', {
      reference: 'WRC-R000001',
      service: 'insurance-review',
      status: 'submitted',
      submittedAt: 1,
      answers: {},
      consentGivenAt: 1,
      delivery: 'queued',
    })
    expect(await deliverQueued()).toBe(2)
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      'https://n8n.example.test/hook',
      'https://api.example.test/requests',
    ])
  })

  it('never posts the same request twice when asked to deliver twice at once', async () => {
    automation.url = 'https://n8n.example.test/hook'
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(new Response('{}', { status: 200 }))
          }, 20)
        }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    await diamond('WRC-DEEEEEE')
    const [first, second] = await Promise.all([deliverQueued(), deliverQueued()])
    expect(first + second).toBeGreaterThanOrEqual(1)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
