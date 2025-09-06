"use client"

import { useState } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { GlobalVault } from "@/components/vault/global-vault"
import { WholeStoryEditor } from "@/components/story/whole-story-editor"
import { WholeStoryPreview } from "@/components/story/whole-story-preview"

export default function WholeStoryPage() {
  const [currentView, setCurrentView] = useState<"vault" | "editor" | "preview">("editor")

  const handleViewChange = (view: "vault" | "editor" | "preview") => {
    console.log("[Whole Page] Change view", { from: currentView, to: view })
    setCurrentView(view)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      <AppHeader title="Whole Story Mode" />
      <div className="flex">
        <AppSidebar currentView={currentView} mode="whole" onViewChange={handleViewChange} />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {currentView === "vault" && <GlobalVault />}
            {currentView === "editor" && <WholeStoryEditor />}
            {currentView === "preview" && <WholeStoryPreview />}
          </div>
        </main>
      </div>
    </div>
  )
}
