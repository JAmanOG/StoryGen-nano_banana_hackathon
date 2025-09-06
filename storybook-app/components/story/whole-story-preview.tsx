"use client"

import { useState, useEffect } from "react"
import { BookOpen } from "lucide-react"
import { EnhancedPreview } from "./enhanced-preview"
import type { StoryExportData } from "@/lib/export-utils"

interface StoryMetadata {
  title: string
  author: string
  description: string
  genre: string
  targetAge: string
}

interface Scene {
  id: string
  title: string
  content: string
  imagePrompt: string
  pageNumber: number
  imageUrl?: string
}

interface Story {
  metadata: StoryMetadata
  fullScript: string
  scenes: Scene[]
  isGenerated: boolean
}

export function WholeStoryPreview() {
  const [story, setStory] = useState<Story | null>(null)
  const [currentPage, setCurrentPage] = useState(0) // 0 = cover, 1+ = scenes

  useEffect(() => {
    const load = () => {
      const savedStory = localStorage.getItem("wholeStory")
      if (savedStory) {
        try {
          const parsed = JSON.parse(savedStory)
          console.log("[Whole Preview] Loaded story from localStorage", {
            title: parsed?.metadata?.title,
            scenes: parsed?.scenes?.length,
            isGenerated: parsed?.isGenerated,
          })
          setStory(parsed)
          setCurrentPage(0)
        } catch (e) {
          console.error("[Whole Preview] Failed to parse wholeStory from localStorage", e)
          setStory(null)
        }
      } else {
        console.log("[Whole Preview] No wholeStory in localStorage")
        setStory(null)
      }
    }

    // Initial load
    load()

    // Listen for updates from the editor
    const handler = () => {
      console.log("[Whole Preview] Detected wholeStoryUpdated event, reloading story from localStorage")
      load()
    }

    window.addEventListener("wholeStoryUpdated", handler)
    return () => {
      window.removeEventListener("wholeStoryUpdated", handler)
    }
  }, [])

  const handlePageChange = (page: number) => {
    console.log("[Whole Preview] Change page", { from: currentPage, to: page })
    setCurrentPage(page)
  }

  if (!story) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No story to preview</h3>
        <p className="text-gray-600 dark:text-gray-300">Create and generate a story first to see the preview</p>
      </div>
    )
  }

  // Allow preview for saved drafts as well as generated stories
  // (This mirrors the page-by-page preview behavior where saved drafts are visible.)

  const totalPages = story.scenes.length + 1 // +1 for cover page

  const storyExportData: StoryExportData = {
    metadata: {
      ...story.metadata,
      exportedAt: new Date().toISOString(),
      format: "preview",
    },
    content: story.scenes.map((scene) => ({
      pageNumber: scene.pageNumber,
      title: scene.title,
      content: scene.content,
      imagePrompt: scene.imagePrompt,
      imageUrl: scene.imageUrl,
    })),
    stats: {
      totalPages: story.scenes.length,
      totalWords: story.scenes.reduce((total, scene) => total + scene.content.split(" ").filter(Boolean).length, 0),
    },
  }

  return (
    <EnhancedPreview
      storyData={storyExportData}
      currentPage={currentPage}
      onPageChange={handlePageChange}
      totalPages={totalPages}
    />
  )
}
