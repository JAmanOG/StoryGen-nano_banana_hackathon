"use client"

import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/hooks"
import { BookOpen } from "lucide-react"
import { EnhancedPreview } from "./enhanced-preview"
import type { StoryExportData } from "@/lib/export-utils"

export function WholeStoryPreview() {
  const story = useAppSelector((state) => state.wholeStory.inMemory)
  const [currentPage, setCurrentPage] = useState(0) // 0 = cover, 1+ = scenes

  // Reset to first content page whenever story changes
  useEffect(() => {
    const hasPages = !!story && story.scenes && story.scenes.length > 0
    setCurrentPage(hasPages ? 1 : 0)
  }, [story?.metadata?.title, story?.scenes?.length])

  const handlePageChange = (page: number) => {
    console.log("[Whole Preview] Change page", { from: currentPage, to: page })
    setCurrentPage(page)
  }

  if (!story || story.scenes.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No story to preview</h3>
        <p className="text-gray-600 dark:text-gray-300">Create and generate a story first to see the preview</p>
      </div>
    )
  }

  const totalPages = story.scenes.length + 1 // +1 for cover page

  const storyExportData: StoryExportData = {
    metadata: {
      ...story.metadata,
      exportedAt: new Date().toISOString(),
      format: "preview",
    },
    cover: story.cover
      ? {
          title: story.cover.title || story.metadata.title,
          subtitle: story.cover.subtitle,
          imageUrl: story.cover.imageUrl,
          imagePrompt: story.cover.imagePrompt,
        }
      : undefined,
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