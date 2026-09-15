# `src/data/` — the §8.1 layering rule

Screens talk **only** to Zustand selectors in `store/`.
Zustand talks **only** to the repository interface in `repo/`.
No component imports Dexie.

`schema/` Zod schemas, one file per entity (§8.2).
`repo/`   Repository interface + LocalRepository (Dexie). The only store of record.
`seed/`   The seeded demo household (§8.3).
`store/`  Zustand slices, each backed by the repo. `persist` goes on the prefs/UI slice ONLY (§8.1).
