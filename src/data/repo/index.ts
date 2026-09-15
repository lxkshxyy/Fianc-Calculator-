import { LocalRepository } from './local'
import type { Repository } from './types'

/**
 * §8.1 — the one instance the stores talk to. Swapping in a networked
 * implementation later means changing this file and nothing else.
 */
export const repo: Repository = new LocalRepository()

export * from './types'
