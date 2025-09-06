"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Edit3, Layers } from "lucide-react"

export default function HomePage() {
  const [selectedMode, setSelectedMode] = useState<"whole" | "page-by-page" | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">StoryBook Creator</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create beautiful, interactive storybooks with our intuitive editor. Choose your preferred creation mode to
            get started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Whole Story Mode */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === "whole" ? "ring-2 ring-indigo-500 shadow-lg" : ""
            }`}
            onClick={() => setSelectedMode("whole")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full w-fit">
                <Edit3 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-2xl">Whole Story Mode</CardTitle>
              <CardDescription className="text-base">
                Create your entire storybook at once with a complete script
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Write the complete story script
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Define page-by-page scenes
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Generate entire storybook at once
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  No updates after generation
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Page-by-Page Mode */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === "page-by-page" ? "ring-2 ring-indigo-500 shadow-lg" : ""
            }`}
            onClick={() => setSelectedMode("page-by-page")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
                <Layers className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Page-by-Page Mode</CardTitle>
              <CardDescription className="text-base">
                Build your story incrementally, one page at a time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Create pages incrementally
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Preview as you build
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Update pages anytime
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Flexible editing workflow
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {selectedMode && (
          <div className="text-center mt-8">
            <Button
              size="lg"
              className="px-8 py-3 text-lg"
              onClick={() => {
                if (selectedMode === "whole") {
                  window.location.href = "/whole-story"
                } else {
                  window.location.href = "/page-by-page"
                }
              }}
            >
              Start Creating with {selectedMode === "whole" ? "Whole Story" : "Page-by-Page"} Mode
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
