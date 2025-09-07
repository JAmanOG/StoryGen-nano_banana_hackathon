"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { EnhancedPreview } from "./enhanced-preview"
import type { StoryExportData } from "@/lib/export-utils"
import { useAppSelector } from "@/store/hooks"

export function PageByPagePreview() {
  const story = useAppSelector((s) => s.pageByPage.story)
  const [currentPage, setCurrentPage] = useState(0) // 0 = cover, 1+ = story pages

  if (!story || story.pages.length === 0) {
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
    // include cover when available so EnhancedPreview can render the cover (currentPage === 0)
    cover: story.cover
      ? {
          title: story.cover.title || story.title,
          subtitle: story.cover.subtitle,
          imageUrl: story.cover.imageUrl,
          imagePrompt: story.cover.imagePrompt,
        }
      : undefined,
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
      onPageChange={setCurrentPage}
      totalPages={totalPages}
    />
  )
}
