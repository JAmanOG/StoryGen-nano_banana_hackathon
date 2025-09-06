"use client"

import { BookOpen, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AppHeaderProps {
  title?: string
  showHomeButton?: boolean
}

export function AppHeader({ title = "StoryBook Creator", showHomeButton = true }: AppHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/library">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <BookOpen className="h-4 w-4" />
                Library
              </Button>
            </Link>
            {showHomeButton && (
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
