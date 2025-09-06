"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Edit3, Eye, Layers, Trash2 } from "lucide-react"
import Link from "next/link"

interface WholeStoryScene {
  id: string
  title: string
  content: string
  imagePrompt: string
  pageNumber: number
}

interface WholeStoryData {
  metadata: {
    title: string
    author: string
    description: string
    genre: string
    targetAge: string
  }
  fullScript: string
  scenes: WholeStoryScene[]
  isGenerated: boolean
}

interface PageByPagePage {
  id: string
  pageNumber: number
  title: string
  content: string
  imagePrompt: string
  isGenerated: boolean
  generatedAt?: string | Date
}

interface PageByPageData {
  id: string
  title: string
  author: string
  pages: PageByPagePage[]
  currentPageIndex: number
}

export default function LibraryPage() {
  const [wholeStory, setWholeStory] = useState<WholeStoryData | null>(null)
  const [pageByPageStory, setPageByPageStory] = useState<PageByPageData | null>(null)

  useEffect(() => {
    try {
      const ws = localStorage.getItem("wholeStory")
      if (ws) {
        const parsed = JSON.parse(ws)
        console.log("[Library] Loaded wholeStory", {
          title: parsed?.metadata?.title,
          scenes: parsed?.scenes?.length,
          isGenerated: parsed?.isGenerated,
        })
        setWholeStory(parsed)
      } else {
        console.log("[Library] No wholeStory found")
      }
    } catch (e) {
      console.warn("[Library] Failed to parse wholeStory", e)
    }

    try {
      const pbp = localStorage.getItem("pageByPageStory")
      if (pbp) {
        const parsed = JSON.parse(pbp)
        console.log("[Library] Loaded pageByPageStory", {
          title: parsed?.title,
          pages: parsed?.pages?.length,
          generated: parsed?.pages?.filter((p: any) => p.isGenerated).length,
        })
        setPageByPageStory(parsed)
      } else {
        console.log("[Library] No pageByPageStory found")
      }
    } catch (e) {
      console.warn("[Library] Failed to parse pageByPageStory", e)
    }
  }, [])

  const clearWholeStory = () => {
    console.log("[Library] Clear wholeStory clicked")
    localStorage.removeItem("wholeStory")
    setWholeStory(null)
  }

  const clearPageByPage = () => {
    console.log("[Library] Clear pageByPageStory clicked")
    localStorage.removeItem("pageByPageStory")
    setPageByPageStory(null)
  }

  const hasAny = !!wholeStory || !!pageByPageStory

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      <AppHeader title="Library" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Story Projects</h2>
          <p className="text-gray-600 dark:text-gray-300">Quickly access saved projects and continue where you left off.</p>
        </div>

        {!hasAny ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No saved projects</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Create a story to see it appear here.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/whole-story">
                <Button>Start Whole Story</Button>
              </Link>
              <Link href="/page-by-page">
                <Button variant="outline">Start Page-by-Page</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {wholeStory && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-indigo-600" />
                    <CardTitle>Whole Story</CardTitle>
                  </div>
                  {wholeStory.isGenerated ? (
                    <Badge variant="secondary">Generated</Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {wholeStory.metadata.title || "Untitled Story"}
                    </div>
                    {wholeStory.metadata.author && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">by {wholeStory.metadata.author}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>{wholeStory.scenes.length} pages</span>
                    {wholeStory.metadata.genre && <span>• {wholeStory.metadata.genre}</span>}
                    {wholeStory.metadata.targetAge && <span>• Ages {wholeStory.metadata.targetAge}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Link href="/whole-story">
                      <Button size="sm" className="gap-2">
                        <Edit3 className="h-4 w-4" /> Editor
                      </Button>
                    </Link>
                    <Link href="/whole-story">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Eye className="h-4 w-4" /> Preview
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="gap-2 text-red-600" onClick={clearWholeStory}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {pageByPageStory && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-green-600" />
                    <CardTitle>Page-by-Page</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {pageByPageStory.pages.filter((p) => p.isGenerated).length} / {pageByPageStory.pages.length} generated
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pageByPageStory.title || "Untitled Project"}
                    </div>
                    {pageByPageStory.author && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">by {pageByPageStory.author}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>{pageByPageStory.pages.length} pages</span>
                    <span>
                      • {pageByPageStory.pages.reduce((w, p) => w + p.content.split(" ").filter(Boolean).length, 0)} words
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/page-by-page">
                      <Button size="sm" className="gap-2">
                        <Edit3 className="h-4 w-4" /> Editor
                      </Button>
                    </Link>
                    <Link href="/page-by-page">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Eye className="h-4 w-4" /> Preview
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="gap-2 text-red-600" onClick={clearPageByPage}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
