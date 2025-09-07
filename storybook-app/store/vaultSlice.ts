import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface VaultItem {
  id: string
  type: "text" | "image"
  title: string
  content: string
  tags: string[]
  createdAt: string // store as ISO for serializability
}

interface VaultState {
  items: VaultItem[]
}

const initialState: VaultState = {
  items: [],
}

const vaultSlice = createSlice({
  name: "vault",
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<VaultItem[]>) {
      state.items = action.payload
    },
    addItem(state, action: PayloadAction<VaultItem>) {
      state.items.unshift(action.payload)
    },
    deleteItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((it) => it.id !== action.payload)
    },
    clear(state) {
      state.items = []
    },
  },
})

export const { setItems, addItem, deleteItem, clear } = vaultSlice.actions
export default vaultSlice.reducer