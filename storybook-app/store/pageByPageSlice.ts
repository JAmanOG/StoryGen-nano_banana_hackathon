import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface StoryPage {
  id: string
  pageNumber: number
  title: string
  content: string
  imagePrompt: string
  isGenerated: boolean
  generatedAt?: string
  imageUrl?: string
  refImageFile?: Blob
  refImagePreview?: string
}

export interface StoryCover {
  title: string
  subtitle?: string
  imagePrompt: string
  imageUrl?: string
}

export interface PageByPageStory {
  id: string
  title: string
  author: string
  cover?: StoryCover
  description?: string
  pages: StoryPage[]
  currentPageIndex: number
}

interface PageByPageState {
  story: PageByPageStory
}

const initialState: PageByPageState = {
  story: {
    id: "page-story-1",
    title: "My Page-by-Page Story",
    author: "",
    pages: [
      {
        id: "page-1",
        pageNumber: 1,
        title: "Page 1",
        content: "",
        imagePrompt: "",
        isGenerated: false,
      },
    ],
    currentPageIndex: 0,
  },
}

const pageByPageSlice = createSlice({
  name: "pageByPage",
  initialState,
  reducers: {
    setStory(state, action: PayloadAction<PageByPageStory>) {
      state.story = action.payload
    },
    updateStoryInfo(
      state,
      action: PayloadAction<{ field: "title" | "author" | "description"; value: string }>
    ) {
      state.story[action.payload.field] = action.payload.value as any
    },
    setCover(
      state,
      action: PayloadAction<StoryCover | null>
    ) {
      if (action.payload) {
        state.story.cover = action.payload
      } else {
        delete state.story.cover
      }
    },
    updatePageField(
      state,
      action: PayloadAction<{ index: number; field: keyof StoryPage; value: any }>
    ) {
      const { index, field, value } = action.payload
      const page = state.story.pages[index]
      if (!page) return
      ;(page as any)[field] = value
    },
    addPage(state) {
      const newPage: StoryPage = {
        id: `page-${Date.now()}`,
        pageNumber: state.story.pages.length + 1,
        title: `Page ${state.story.pages.length + 1}`,
        content: "",
        imagePrompt: "",
        isGenerated: false,
      }
      state.story.pages.push(newPage)
      state.story.currentPageIndex = state.story.pages.length - 1
    },
    deleteCurrentPage(state) {
      const idx = state.story.currentPageIndex
      if (state.story.pages.length <= 1) return
      const removed = state.story.pages[idx]
      if (removed?.refImagePreview) {
        try { URL.revokeObjectURL(removed.refImagePreview) } catch {}
      }
      state.story.pages = state.story.pages
        .filter((_, i) => i !== idx)
        .map((p, i) => ({
          ...p,
          pageNumber: i + 1,
          title: p.title.startsWith("Page ") ? `Page ${i + 1}` : p.title,
        }))
      state.story.currentPageIndex = Math.min(
        state.story.currentPageIndex,
        state.story.pages.length - 1
      )
    },
    setCurrentPageIndex(state, action: PayloadAction<number>) {
      state.story.currentPageIndex = Math.max(
        0,
        Math.min(action.payload, state.story.pages.length - 1)
      )
    },
    applyGenerationToCurrent(
      state,
      action: PayloadAction<{ enhancedContent?: string; imagePrompt?: string; imageDataUrl?: string }>
    ) {
      const idx = state.story.currentPageIndex
      const page = state.story.pages[idx]
      if (!page) return
      page.content = action.payload.enhancedContent ?? page.content
      page.imagePrompt = action.payload.imagePrompt ?? page.imagePrompt
      page.imageUrl = action.payload.imageDataUrl ?? page.imageUrl
      page.isGenerated = true
      page.generatedAt = new Date().toISOString()
    },
    setReferenceImage(
      state,
      action: PayloadAction<{ index: number; file?: Blob | null; preview?: string | null }>
    ) {
      const { index, file, preview } = action.payload
      const page = state.story.pages[index]
      if (!page) return
      // cleanup previous preview
      if (page.refImagePreview && page.refImagePreview !== preview) {
        try { URL.revokeObjectURL(page.refImagePreview) } catch {}
      }
      page.refImageFile = file ?? undefined
      page.refImagePreview = preview ?? undefined
    },
    resetPageByPage() {
      return initialState
    },
  },
})

export const {
  setStory,
  updateStoryInfo,
  setCover,
  updatePageField,
  addPage,
  deleteCurrentPage,
  setCurrentPageIndex,
  applyGenerationToCurrent,
  setReferenceImage,
  resetPageByPage,
} = pageByPageSlice.actions

export default pageByPageSlice.reducer