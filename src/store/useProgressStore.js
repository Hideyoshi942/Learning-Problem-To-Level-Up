import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      // Zustand persist doesn't handle Set natively → serialize
      serialize: (state) =>
        JSON.stringify({ ...state, completed: [...state.completed] }),
      deserialize: (str) => {
        const parsed = JSON.parse(str)
        return { ...parsed, completed: new Set(parsed.completed ?? []) }
      },
    }
  )
)

export default useProgressStore
