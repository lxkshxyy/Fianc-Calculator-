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

import { repo } from '../repo'
import { deliverQueued } from './outbox'

describe('delivering to the WRC server', () => {
  beforeEach(async () => {
    await repo.clearEverything()
  })

  afterEach(() => {
    server.url = ''
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
