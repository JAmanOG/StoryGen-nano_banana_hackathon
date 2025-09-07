"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Share2,
  Printer,
  Eye,
} from "lucide-react";
import { ExportDialog } from "./export-dialog";
import type { StoryExportData } from "@/lib/export-utils";

interface EnhancedPreviewProps {
  storyData: StoryExportData;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function EnhancedPreview({
  storyData,
  currentPage,
  onPageChange,
  totalPages,
}: EnhancedPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingMode, setReadingMode] = useState(false);

  const isOnCover = currentPage === 0;
  const currentStoryPage = storyData.content[currentPage - 1];

  const goToPage = (page: number) => {
    console.log("[Preview] Navigate to page", { from: currentPage, to: page });
    onPageChange(page);
  };

  const handlePrint = () => {
    console.log("[Preview] Print clicked", {
      title: storyData.metadata.title,
      totalPages: storyData.stats.totalPages,
    });
    window.print();
  };

  const handleShare = async () => {
    console.log("[Preview] Share clicked", { title: storyData.metadata.title });
    if (navigator.share) {
      try {
        await navigator.share({
          title: storyData.metadata.title,
          text:
            storyData.metadata.description ||
            `A storybook by ${storyData.metadata.author}`,
          url: window.location.href,
        });
        console.log("[Preview] Share success");
      } catch (error) {
        console.warn("[Preview] Share failed, copying URL instead", error);
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      console.log("[Preview] Web Share API not available; copying URL");
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const PreviewContent = () => (
    <div className="space-y-6">
      {/* Enhanced Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => goToPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {isOnCover ? "Cover" : `Page ${currentPage}`} of {totalPages}
          </span>
          <div className="flex gap-1">
            {/* Cover page indicator */}
            <button
              onClick={() => goToPage(0)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentPage === 0
                  ? "bg-indigo-500"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
              title="Cover"
            />
            {/* Story pages indicators */}
            {storyData.content.map((_, index) => (
              <button
                key={index}
                onClick={() => goToPage(index + 1)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentPage === index + 1
                    ? "bg-indigo-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
                title={`Page ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => goToPage(Math.min(totalPages - 1, currentPage + 1))}
          disabled={currentPage === totalPages - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Enhanced Story Display */}
      <Card
        className={`min-h-[600px] ${
          readingMode ? "bg-amber-50 dark:bg-amber-950" : ""
        }`}
      >
        <CardContent className={`p-8 ${readingMode ? "font-serif" : ""}`}>
          {isOnCover ? (
            /* Enhanced Cover Page */
            <div className="text-center space-y-6 py-12">
              {storyData.cover?.imageUrl ? (
                <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={storyData.cover.imageUrl}
                    alt={
                      storyData.cover.imagePrompt ||
                      storyData.cover.title ||
                      storyData.metadata.title
                    }
                    className="w-full h-80 object-contain bg-white dark:bg-black"
                  />
                </div>
              ) : (
                <div className="w-48 h-64 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-lg flex items-center justify-center shadow-lg">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📚</div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      Storybook
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h1
                  className={`text-4xl font-bold text-gray-900 dark:text-white ${
                    readingMode ? "text-5xl" : ""
                  }`}
                >
                  {storyData.cover?.title || storyData.metadata.title}
                </h1>
                {storyData.cover?.subtitle && (
                  <div className="text-lg text-gray-600 dark:text-gray-300">
                    {storyData.cover.subtitle}
                  </div>
                )}

                {storyData.metadata.author && (
                  <div className="flex items-center justify-center gap-2 text-lg text-gray-600 dark:text-gray-300">
                    <span>by {storyData.metadata.author}</span>
                  </div>
                )}

                {storyData.metadata.description && (
                  <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                    {storyData.metadata.description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {storyData.metadata.genre && (
                    <Badge variant="secondary">
                      {storyData.metadata.genre}
                    </Badge>
                  )}
                  {storyData.metadata.targetAge && (
                    <Badge variant="outline">
                      Ages {storyData.metadata.targetAge}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {storyData.stats.totalPages} Pages
                  </Badge>
                  <Badge variant="outline">
                    {storyData.stats.totalWords} Words
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            /* Enhanced Story Page */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2
                  className={`text-2xl font-bold text-gray-900 dark:text-white ${
                    readingMode ? "text-3xl" : ""
                  }`}
                >
                  {currentStoryPage?.title}
                </h2>
                <Badge variant="outline">Page {currentPage}</Badge>
              </div>

              {/* Enhanced Image Display */}
              <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center shadow-inner overflow-hidden">
                {currentStoryPage?.imageUrl ? (
                  <img
                    src={currentStoryPage.imageUrl}
                    alt={
                      currentStoryPage?.imagePrompt ||
                      currentStoryPage?.title ||
                      "Story illustration"
                    }
                    className="w-full h-full object-contain"
                  />
                ) : currentStoryPage?.imagePrompt ? (
                  <div className="text-center p-6">
                    <div className="text-6xl mb-4">🎨</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
                      Story Illustration
                    </div>
                    {/* <div className="text-xs text-gray-400 dark:text-gray-500 italic max-w-md leading-relaxed">
                      "{currentStoryPage.imagePrompt}"
                    </div> */}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <div className="text-4xl mb-2">📖</div>
                    <div className="text-sm">No illustration specified</div>
                  </div>
                )}
              </div>

              {/* Enhanced Content Display */}
              <div
                className={`prose dark:prose-invert max-w-none ${
                  readingMode ? "prose-lg" : ""
                }`}
              >
                {currentStoryPage?.content ? (
                  <div
                    className={`leading-relaxed text-gray-700 dark:text-gray-300 ${
                      readingMode ? "text-xl leading-loose" : "text-lg"
                    }`}
                  >
                    {currentStoryPage.content
                      .split("image description by the user:")[0]
                      .split("\n")
                      .map((paragraph, index) => (
                        <p key={index} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 dark:text-gray-500 mb-2">
                      No content yet
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Add content in the editor to see it here
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Story Preview
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Enhanced reading experience
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              console.log("[Preview] Toggle reading mode", {
                from: readingMode,
                to: !readingMode,
              });
              setReadingMode(!readingMode);
            }}
            className="gap-2 bg-transparent"
          >
            <Eye className="h-4 w-4" />
            {readingMode ? "Normal" : "Reading"} Mode
          </Button>

          <Dialog
            open={isFullscreen}
            onOpenChange={(open) => {
              console.log("[Preview] Fullscreen", { open });
              setIsFullscreen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Maximize2 className="h-4 w-4" />
                Fullscreen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] overflow-auto">
              <PreviewContent />
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleShare}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>

          <ExportDialog storyData={storyData} />
        </div>
      </div>

      {!isFullscreen && <PreviewContent />}
    </div>
  );
}
