"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Trash2,
  Save,
  Wand2,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Lightbulb,
  Image as ImageIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateSinglePage, generateCover } from "@/lib/story-generation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  updateStoryInfo,
  updatePageField,
  addPage,
  deleteCurrentPage,
  setCurrentPageIndex,
  applyGenerationToCurrent,
  setReferenceImage,
  setCover,
} from "@/store/pageByPageSlice"

export function PageByPageEditor() {
  const dispatch = useAppDispatch()
  const story = useAppSelector((s) => s.pageByPage.story)

  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isCoverGenerating, setIsCoverGenerating] = useState(false)

  const currentPage = story.pages[story.currentPageIndex]

  const handleStoryInfoChange = (field: "title" | "author" | "description", value: string) => {
    console.log("[PBP] Story info change", { field, value })
    dispatch(updateStoryInfo({ field, value }))
  }

  const handlePageChange = (field: keyof typeof currentPage, value: string) => {
    console.log("[PBP] Current page change", {
      pageIndex: story.currentPageIndex,
      pageId: story.pages[story.currentPageIndex]?.id,
      field,
      value,
    })
    dispatch(
      updatePageField({ index: story.currentPageIndex, field: field as any, value })
    )
  }

  const handleAddPage = () => {
    console.log("[PBP] Add page clicked", { nextPageNumber: story.pages.length + 1 })
    dispatch(addPage())
    toast({ title: "Page Added", description: "New page created and selected for editing." })
  }

  const handleDeletePage = () => {
    console.log("[PBP] Delete page clicked", {
      pageIndex: story.currentPageIndex,
      page: story.pages[story.currentPageIndex],
      totalPages: story.pages.length,
    })
    if (story.pages.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one page in your story.",
        variant: "destructive",
      })
      return
    }
    dispatch(deleteCurrentPage())
    toast({ title: "Page Deleted", description: "Page removed from story." })
  }

  const handleNavigatePage = (direction: "prev" | "next") => {
    console.log("[PBP] Navigate page", { direction, from: story.currentPageIndex })
    const nextIndex =
      direction === "prev"
        ? Math.max(0, story.currentPageIndex - 1)
        : Math.min(story.pages.length - 1, story.currentPageIndex + 1)
    dispatch(setCurrentPageIndex(nextIndex))
  }

  const handleSavePage = () => {
    console.log("[PBP] Save page", {
      storyId: story.id,
      page: story.pages[story.currentPageIndex],
    })
    // With Redux, changes are already in store. No extra persistence needed here.
    toast({ title: "Page Saved", description: "Current page has been saved successfully." })
  }

  const handleReferenceImageChange = (file?: File | null) => {
    const idx = story.currentPageIndex
    // Cleanup old preview is handled in slice when replacing preview
    if (file) {
      const preview = URL.createObjectURL(file)
      dispatch(setReferenceImage({ index: idx, file, preview }))
    } else {
      dispatch(setReferenceImage({ index: idx, file: null, preview: null }))
    }
  }

  const handleGeneratePage = async () => {
    console.log("[PBP] Generate page clicked", {
      storyContext: { title: story.title, author: story.author },
      pageNumber: currentPage.pageNumber,
      totalPages: story.pages.length,
    })

    if (!currentPage.content && !currentPage.imagePrompt) {
      toast({
        title: "Missing Content",
        description: "Please add some content or image description before generating.",
        variant: "destructive",
      })
      return
    }

    console.log("Generating page...")
    console.log(`Current Page Content: ${currentPage.content}`)
    console.log(`Image Prompt: ${currentPage.imagePrompt}`)

    setIsGenerating(true)
    setGenerationError(null)
    setSuggestions([])

    try {
      const storyContext = `Story: "${story.title}" by ${story.author || "Unknown Author"} Description: "${story.description || "No description"}"`

      const prev = story.pages[story.currentPageIndex - 1]

      const payload = {
        pageContent: currentPage.content,
        imagePrompt: currentPage.imagePrompt,
        storyContext,
        pageNumber: currentPage.pageNumber,
        totalPages: story.pages.length,
        prevImageDataUrl: story.pages[story.currentPageIndex - 1]?.imageUrl,
        prevPageContent: prev?.content,
        prevPageImagePrompt: prev?.imagePrompt,  
        userImage: currentPage.refImageFile,
      }
      console.log("[PBP] POST /api/generate-page payload", { ...payload, userImage: currentPage.refImageFile ? "<blob>" : undefined })

      
      const result = await generateSinglePage(payload)
      console.log("[PBP] /api/generate-page result", result)

      if (result.success) {
        dispatch(
          applyGenerationToCurrent({
            enhancedContent: result.enhancedContent,
            imagePrompt: result.imagePrompt,
            imageDataUrl: result.imageDataUrl,
          })
        )

        if (result.suggestions) setSuggestions(result.suggestions)

        toast({
          title: "Page Generated!",
          description: "Your page has been enhanced with AI content and improved image description.",
        })
      } else {
        setGenerationError(result.error || "Failed to generate page")
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate page. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[PBP] Generate error", error)
      const errorMessage = "An unexpected error occurred during generation."
      setGenerationError(errorMessage)
      toast({ title: "Generation Error", description: errorMessage, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateCover = async () => {
    if (!story.title?.trim()) {
      toast({ title: "Missing Title", description: "Please enter a story title first.", variant: "destructive" })
      return
    }

    setIsCoverGenerating(true)
    try {
      const res = await generateCover({
        title: story.title,
        author: story.author,
        description: story.description,
        prevImageDataUrl: story.cover?.imageUrl,
      })
      if (res.success && res.cover) {
        dispatch(
          setCover({
            title: res.cover.title || story.title,
            subtitle: res.cover.subtitle,
            imagePrompt: res.cover.imagePrompt,
            imageUrl: res.cover.imageDataUrl,
          })
        )
        toast({ title: "Cover Generated", description: "A new cover was created for your story." })
      } else {
        toast({ title: "Cover Generation Failed", description: res.error || "Try again.", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Could not generate cover.", variant: "destructive" })
    } finally {
      setIsCoverGenerating(false)
    }
  }

  const handleClearCover = () => {
    dispatch(setCover(null))
    toast({ title: "Cover Removed", description: "Cover cleared from story." })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Page Editor</h2>
            <p className="text-gray-600 dark:text-gray-300">Edit your story one page at a time</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSavePage} variant="outline" className="gap-2 bg-transparent">
              <Save className="h-4 w-4" />
              Save Page
            </Button>
            <Button onClick={handleGeneratePage} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Page
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Story Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Story Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="storyTitle">Story Title</Label>
                <Input
                  id="storyTitle"
                  placeholder="Enter story title..."
                  value={story.title}
                  onChange={(e) => handleStoryInfoChange("title", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="storyAuthor">Author</Label>
                <Input
                  id="storyAuthor"
                  placeholder="Author name..."
                  value={story.author}
                  onChange={(e) => handleStoryInfoChange("author", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="storyDescription">Description</Label>
                <Input
                  id="storyDescription"
                  placeholder="Description here..."
                  value={story.description}
                  onChange={(e) => handleStoryInfoChange("description", e.target.value)}
                />
              </div>
            </div>

            {/* Cover Controls */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-2 space-y-2">
                <Label>Book Cover</Label>
                <div className="flex gap-2">
                  <Button onClick={handleGenerateCover} disabled={isCoverGenerating} className="gap-2">
                    {isCoverGenerating ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" /> Generating Cover...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" /> Generate Cover
                      </>
                    )}
                  </Button>
                  {story.cover?.imageUrl && (
                    <Button variant="outline" onClick={handleClearCover} className="gap-2 bg-transparent">
                      <Trash2 className="h-4 w-4" /> Remove Cover
                    </Button>
                  )}
                </div>
                {story.cover?.imagePrompt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                    Prompt: {story.cover.imagePrompt}
                  </p>
                )}
              </div>
              <div>
                {story.cover?.imageUrl ? (
                  <img
                    src={story.cover.imageUrl}
                    alt={story.cover.imagePrompt || story.cover.title || "Cover"}
                    className="w-full h-40 object-contain rounded border"
                  />
                ) : (
                  <div className="w-full h-40 rounded border border-dashed flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No cover yet
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Page Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => handleNavigatePage("prev")}
                disabled={story.currentPageIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Page
              </Button>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Current Page</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentPage.pageNumber} of {story.pages.length}
                  </div>
                </div>

                <div className="flex gap-1">
                  {story.pages.map((page, index) => (
                    <button
                      key={page.id}
                      onClick={() => dispatch(setCurrentPageIndex(index))}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        index === story.currentPageIndex
                          ? "bg-indigo-500 text-white"
                          : page.isGenerated
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {page.pageNumber}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => handleNavigatePage("next")}
                disabled={story.currentPageIndex === story.pages.length - 1}
                className="gap-2"
              >
                Next Page
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Page Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Edit Current Page</CardTitle>
                {currentPage.isGenerated && (
                  <Badge variant="secondary" className="gap-1">
                    <Wand2 className="h-3 w-3" />
                    Generated
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPage} size="sm" variant="outline" className="gap-2 bg-transparent">
                  <Plus className="h-4 w-4" />
                  Add Page
                </Button>
                {story.pages.length > 1 && (
                  <Button
                    onClick={handleDeletePage}
                    size="sm"
                    variant="outline"
                    className="gap-2 text-red-500 hover:text-red-700 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Page
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pageTitle">Page Title</Label>
              <Input
                id="pageTitle"
                placeholder="Enter page title..."
                value={currentPage.title}
                onChange={(e) => handlePageChange("title", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pageContent">Page Content</Label>
              <Textarea
                id="pageContent"
                placeholder="Write the content for this page..."
                value={currentPage.content}
                onChange={(e) => handlePageChange("content", e.target.value)}
                rows={8}
              />
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {currentPage.content.length} characters • {currentPage.content.split(" ").filter(Boolean).length} words
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="imagePrompt">Image Description</Label>
                <Input
                  id="imagePrompt"
                  placeholder="Describe the image for this page..."
                  value={currentPage.imagePrompt}
                  onChange={(e) => handlePageChange("imagePrompt", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Reference Image (optional)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleReferenceImageChange(e.target.files?.[0])}
                    className="file:mr-3 file:rounded file:border file:px-3 file:py-1 file:text-sm"
                  />
                  {currentPage.refImagePreview && (
                    <div className="flex items-center gap-2">
                      <img
                        src={currentPage.refImagePreview}
                        alt="Reference preview"
                        className="h-16 w-16 object-cover rounded border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReferenceImageChange(null)}
                        className="gap-2 bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded image helps maintain visual continuity.</p>
              </div>
            </div>

            {currentPage.isGenerated && currentPage.generatedAt && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                  <Wand2 className="h-4 w-4" />
                  <span>Generated on {new Date(currentPage.generatedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                  This page has been generated with AI. You can still edit and regenerate it.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Page Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Story Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {story.pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    index === story.currentPageIndex
                      ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => dispatch(setCurrentPageIndex(index))}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index === story.currentPageIndex ? "default" : "outline"}>Page {page.pageNumber}</Badge>
                    <span className="font-medium text-gray-900 dark:text-white">{page.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {page.isGenerated && (
                      <Badge variant="secondary" className="text-xs">
                        Generated
                      </Badge>
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {page.content.split(" ").filter(Boolean).length} words
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {generationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{generationError}</AlertDescription>
          </Alert>
        )}
      </div>
    </>
  )
}
