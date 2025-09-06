"use client"

import { useState, useEffect } from "react"
import { BookOpen } from "lucide-react"
import { EnhancedPreview } from "./enhanced-preview"
import type { StoryExportData } from "@/lib/export-utils"

interface StoryPage {
  id: string
  pageNumber: number
  title: string
  content: string
  imagePrompt: string
  isGenerated: boolean
  generatedAt?: Date
  imageUrl?: string
}

interface PageByPageStory {
  id: string
  title: string
  author: string
  pages: StoryPage[]
  currentPageIndex: number
}

export function PageByPagePreview() {
  const [story, setStory] = useState<PageByPageStory | null>(null)
  const [currentPage, setCurrentPage] = useState(0) // 0 = cover, 1+ = story pages

  useEffect(() => {
    const loadFromStorage = () => {
      const savedStory = localStorage.getItem("pageByPageStory")
      if (savedStory) {
        const parsed = JSON.parse(savedStory)
        console.log("[PBP Preview] Loaded story from localStorage", {
          title: parsed.title,
          pages: parsed.pages?.length,
          generatedPages: parsed.pages?.filter((p: any) => p.isGenerated).length,
        })
        setStory(parsed)
      } else {
        console.log("[PBP Preview] No story in localStorage")
        setStory(null)
      }
    }

    // Initial load
    loadFromStorage()

    // Listen for updates from the editor
    const handler = () => {
      console.log("[PBP Preview] Detected pageByPageStoryUpdated event, reloading story from localStorage")
      loadFromStorage()
    }

    window.addEventListener("pageByPageStoryUpdated", handler)
    return () => {
      window.removeEventListener("pageByPageStoryUpdated", handler)
    }
  }, [])

  const handlePageChange = (page: number) => {
    console.log("[PBP Preview] Change page", { from: currentPage, to: page })
    setCurrentPage(page)
  }

  if (!story) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No story to preview</h3>
        <p className="text-gray-600 dark:text-gray-300">Create some pages first to see the preview</p>
      </div>
    )
  }

  const totalPages = story.pages.length + 1 // +1 for cover page
  const generatedPagesCount = story.pages.filter((page) => page.isGenerated).length
  const totalWordsCount = story.pages.reduce((total, page) => total + page.content.split(" ").filter(Boolean).length, 0)

  const storyExportData: StoryExportData = {
    metadata: {
      title: story.title,
      author: story.author,
      description: `A ${story.pages.length}-page storybook created page by page`,
      genre: "",
      targetAge: "",
      exportedAt: new Date().toISOString(),
      format: "preview",
    },
    content: story.pages.map((page) => ({
      pageNumber: page.pageNumber,
      title: page.title,
      content: page.content,
      imagePrompt: page.imagePrompt,
      imageUrl: page.imageUrl,
    })),
    stats: {
      totalPages: story.pages.length,
      totalWords: totalWordsCount,
      generatedPages: generatedPagesCount,
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
