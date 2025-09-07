"use client"

import { Provider } from "react-redux"
import { store } from "@/store/store"
import { useEffect } from "react"
import { useAppDispatch } from "@/store/hooks"
import { setStory } from "@/store/pageByPageSlice"

function StoreHydrator() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Hydrate page-by-page story from localStorage
    try {
      const raw = localStorage.getItem("pageByPageStory")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.pages) dispatch(setStory(parsed))
      }
    } catch (e) {
      console.warn("[Providers] Failed to hydrate pageByPageStory", e)
    }

    // Subscribe to persist changes
    const unsub = store.subscribe(() => {
      try {
        const state = store.getState()
        const story = state.pageByPage.story
        const persistable = {
          ...story,
          pages: story.pages.map(({ refImageFile, refImagePreview, ...rest }) => ({ ...rest })),
        }
        localStorage.setItem("pageByPageStory", JSON.stringify(persistable))
      } catch (e) {
        console.warn("[Providers] Failed to persist pageByPageStory", e)
      }
    })

    return () => unsub()
  }, [dispatch])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <StoreHydrator />
      {children}
    </Provider>
  )
}