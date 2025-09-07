import { configureStore } from "@reduxjs/toolkit"
import vaultReducer from "./vaultSlice"
import pageByPageReducer from "./pageByPageSlice"
import wholeStoryReducer from "./wholeStorySlice"

export const store = configureStore({
  reducer: {
    vault: vaultReducer,
    pageByPage: pageByPageReducer,
    wholeStory: wholeStoryReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch