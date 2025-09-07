// wholeStorySlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface StoryMetadata {
  title: string
  author: string
  description: string
  genre: string
  targetAge: string
}

export interface Scene {
  id: string
  title: string
  content: string
  imagePrompt: string
  pageNumber: number
  imageUrl?: string
}

// New: cover info for whole story
export interface StoryCover {
  title: string
  subtitle?: string
  imagePrompt: string
  imageUrl?: string
}

export interface WholeStory {
  metadata: StoryMetadata
  fullScript: string
  scenes: Scene[]
  isGenerated: boolean
  // New optional cover
  cover?: StoryCover
}

interface WholeStoryState {
  story: WholeStory | null
  inMemory: WholeStory
}

const initialState: WholeStoryState = {
  story: null,
  inMemory: {
    metadata: {
      title: "",
      author: "",
      description: "",
      genre: "",
      targetAge: "",
    },
    fullScript: "",
    scenes: [],
    isGenerated: false,
    // cover initially undefined
  },
}

const wholeStorySlice = createSlice({
  name: "wholeStory",
  initialState,
  reducers: {
    setWholeStory(state, action: PayloadAction<WholeStory | null>) {
      state.story = action.payload
    },
    setInMemoryWholeStory(state, action: PayloadAction<WholeStory>) {
      state.inMemory = action.payload
    },
    // New: set cover on in-memory story
    setCover(state, action: PayloadAction<StoryCover | null>) {
      if (action.payload) {
        state.inMemory.cover = action.payload
      } else {
        delete state.inMemory.cover
      }
    },
    updateMetadata(state, action: PayloadAction<{ field: keyof StoryMetadata; value: string }>) {
      const { field, value } = action.payload
      state.inMemory.metadata[field] = value
    },
    updateFullScript(state, action: PayloadAction<string>) {
      state.inMemory.fullScript = action.payload
    },
    addScene(state) {
      const newScene: Scene = {
        id: Date.now().toString(),
        title: `Scene ${state.inMemory.scenes.length + 1}`,
        content: "",
        imagePrompt: "",
        pageNumber: state.inMemory.scenes.length + 1,
      }
      state.inMemory.scenes.push(newScene)
    },
    updateScene(state, action: PayloadAction<{ sceneId: string; field: keyof Scene; value: string | number }>) {
      const { sceneId, field, value } = action.payload
      const scene = state.inMemory.scenes.find(s => s.id === sceneId)
      if (scene) {
        scene[field] = value as never
      }
    },
    deleteScene(state, action: PayloadAction<string>) {
      state.inMemory.scenes = state.inMemory.scenes
        .filter(scene => scene.id !== action.payload)
        .map((scene, index) => ({ ...scene, pageNumber: index + 1 }))
    },
    markAsGenerated(state) {
      state.inMemory.isGenerated = true
    },
    clearWholeStory(state) {
      state.story = null
      state.inMemory = initialState.inMemory
    },
  },
})

export const { 
  setWholeStory, 
  setInMemoryWholeStory, 
  setCover, 
  updateMetadata, 
  updateFullScript, 
  addScene, 
  updateScene, 
  deleteScene, 
  markAsGenerated,
  clearWholeStory 
} = wholeStorySlice.actions

export default wholeStorySlice.reducer