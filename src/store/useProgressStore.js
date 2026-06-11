import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Coerce any persisted shape into a real Set.
// Handles: array (current format), Set (in-memory), legacy `{}` produced by
// older builds that JSON.stringify-ed a Set (Zustand v5 dropped the
// serialize/deserialize options, so a Set silently serialized to "{}"),
// and undefined/null.
function toSet(value) {
  if (value instanceof Set) return value
  if (Array.isArray(value)) return new Set(value)
  if (value && typeof value === 'object') {
    // legacy: keys that were truthy were "completed"
    return new Set(Object.keys(value).filter((k) => value[k]))
  }
  return new Set()
}

const useProgressStore = create(
  persist(
    (set, get) => ({
      // Set<"level:slug"> e.g. "1:sql"
      completed: new Set(),

      markDone(levelId, slug) {
        const key = `${levelId}:${slug}`
        set((state) => {
          const next = new Set(state.completed)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return { completed: next }
        })
      },

      isDone(levelId, slug) {
        return get().completed.has(`${levelId}:${slug}`)
      },

      countDoneInLevel(levelId) {
        const prefix = `${levelId}:`
        return [...get().completed].filter((k) => k.startsWith(prefix)).length
      },

      totalDone() {
        return get().completed.size
      },
    }),
    {
      name: 'backend-hub-progress',
      // Zustand v5 removed serialize/deserialize. A Set isn't JSON-serializable,
      // so persist only the array form via partialize, and rebuild the Set on
      // rehydration via merge. merge also repairs the legacy `{}` corruption.
      partialize: (state) => ({ completed: [...state.completed] }),
      merge: (persisted, current) => ({
        ...current,
        completed: toSet(persisted?.completed),
      }),
    }
  )
)

export default useProgressStore
