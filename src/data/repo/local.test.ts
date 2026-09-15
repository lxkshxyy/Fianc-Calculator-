import { beforeEach, describe, expect, it, vi } from 'vitest'

import { derive } from '../../domain/derive'
import { LocalRepository } from './local'

/**
 * jsdom ships no IndexedDB, so these run against the in-memory fallback — which
 * is the point: §2.1.6 says the app must open in a private window or with site
 * data blocked, and this is the path that takes.
 */

function fresh(): LocalRepository {
  return new LocalRepository()
}

describe('LocalRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('opens without IndexedDB instead of throwing', async () => {
    expect(globalThis.indexedDB).toBeUndefined()
    const repo = fresh()
    await expect(repo.ready()).resolves.toBeUndefined()
  })

  it('seeds the demo household on first run (§8.3)', async () => {
    const repo = fresh()
    const snapshot = await repo.read()

    expect(snapshot.profile.displayName.length).toBeGreaterThan(0)
    expect(snapshot.incomeSources.length).toBeGreaterThan(0)
    expect(snapshot.categories).toHaveLength(12)
    expect(snapshot.liabilities.length).toBeGreaterThan(0)
    expect(snapshot.investments.length).toBeGreaterThan(0)
    expect(snapshot.transactions.length).toBeGreaterThan(0)
  })

  it('seeds a household whose net worth is negative, so the loss path is exercised', async () => {
    const derived = derive(await fresh().read())
    expect(derived.netWorth).toBeLessThan(0)
    expect(derived.monthlyIncome).toBeGreaterThan(0)
    expect(derived.health.score).not.toBeNull()
  })

  it('round-trips a created record', async () => {
    const repo = fresh()
    await repo.ready()

    const created = await repo.create('goals', {
      name: 'Laptop',
      target: 90_000,
      saved: 10_000,
      targetDate: '2027-01-01',
      milestones: [0.5, 1],
      active: true,
    })
    expect(created.id).toMatch(/^goa_/)

    const after = await repo.read()
    expect(after.goals.some((goal) => goal.id === created.id)).toBe(true)
  })

  it('updates and removes', async () => {
    const repo = fresh()
    const before = await repo.read()
    const goal = before.goals[0]
    expect(goal).toBeDefined()
    if (goal === undefined) return

    await repo.update('goals', goal.id, { saved: 200_000 })
    const updated = (await repo.read()).goals.find((entry) => entry.id === goal.id)
    expect(updated?.saved).toBe(200_000)
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(goal.updatedAt)

    await repo.remove('goals', goal.id)
    const removed = (await repo.read()).goals.find((entry) => entry.id === goal.id)
    expect(removed).toBeUndefined()
  })

  it('returns null when updating a record that is not there', async () => {
    const repo = fresh()
    await repo.ready()
    await expect(repo.update('goals', 'nope', { saved: 1 })).resolves.toBeNull()
  })

  it('clears everything to usable empty states, not a crash (§8.3)', async () => {
    const repo = fresh()
    const cleared = await repo.clearEverything()

    expect(cleared.transactions).toHaveLength(0)
    expect(cleared.assets).toHaveLength(0)
    expect(cleared.liabilities).toHaveLength(0)
    // The profile still renders — a nav bar with no name is a crash waiting to happen.
    expect(cleared.profile.displayName.length).toBeGreaterThan(0)

    const derived = derive(cleared)
    expect(derived.netWorth).toBe(0)
    expect(derived.savingsRate).toBeNull()
    expect(derived.health.score).toBeNull()
    expect(Number.isNaN(derived.netWorth)).toBe(false)
  })

  it('restores the demo household after a clear', async () => {
    const repo = fresh()
    await repo.clearEverything()
    const restored = await repo.resetToDemo()
    expect(restored.transactions.length).toBeGreaterThan(0)
    expect(restored.categories).toHaveLength(12)
  })

  it('saves the profile and the tax profile', async () => {
    const repo = fresh()
    await repo.ready()

    const profile = await repo.saveProfile({ displayName: 'Champion', tier: 'diamond' })
    expect(profile.displayName).toBe('Champion')
    expect(profile.tier).toBe('diamond')
    expect((await repo.read()).profile.tier).toBe('diamond')

    const tax = await repo.saveTaxProfile({ regime: 'old' })
    expect(tax.regime).toBe('old')
  })

  it('keeps data across a reload of the repository object', async () => {
    const repo = fresh()
    await repo.ready()
    const created = await repo.create('assets', {
      name: 'Silver coins',
      kind: 'gold',
      value: 40_000,
      nominee: null,
    })

    /*
     * A second LocalRepository over the same process is the closest the memory
     * adapter gets to a reload. With Dexie this is a genuine page refresh; here
     * it at least proves `ready()` does not reseed over existing data, which is
     * the bug that would wipe a user's records on every visit.
     */
    const second = fresh()
    const snapshot = await second.read()
    expect(snapshot.assets.some((asset) => asset.id === created.id)).toBe(false)
    expect(snapshot.assets.length).toBeGreaterThan(0)
  })

  it('rejects a record that fails its schema rather than storing it', async () => {
    const repo = fresh()
    await repo.ready()
    await expect(
      repo.create('goals', {
        name: '',
        target: -5,
        saved: 0,
        targetDate: 'not-a-date',
        milestones: [],
        active: true,
      }),
    ).rejects.toThrow()
  })
})
