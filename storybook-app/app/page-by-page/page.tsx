"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { GlobalVault } from "@/components/vault/global-vault"
import { PageByPageEditor } from "@/components/story/page-by-page-editor"
import { PageByPagePreview } from "@/components/story/page-by-page-preview"
import { Button } from "@/components/ui/button"
import { Archive, Home, X } from "lucide-react"
import Link from "next/link"

export default function PageByPagePage() {
  const [showVault, setShowVault] = useState(false)

  useEffect(() => {
    console.log("[PBP Page] Page loaded")
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      <AppHeader title="Page-by-Page Mode" />

      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Button
              variant={showVault ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => { console.log("[PBP Page] Toggle vault", { open: !showVault }); setShowVault(!showVault) }}
            >
              <Archive className="h-4 w-4" />
              Global Context
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">Editor & Preview Mode</div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-8rem)]">
        {showVault && (
          <div className="w-2/5 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Global Context</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVault(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 m-6 overflow-hidden">
              <GlobalVault />
            </div>
          </div>
        )}

        <div className="flex-1 flex">
          {/* Editor Panel */}
          {showVault ? (
            <div className="flex-1 bg-white dark:bg-gray-900">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg">Page Editor</h3>
                <p className="text-sm text-muted-foreground">Write and edit your current page</p>
              </div>
              <div className="h-[calc(100%-5rem)] m-6 overflow-auto">
                <PageByPageEditor />
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-lg">Page Editor</h3>
                  <p className="text-sm text-muted-foreground">Write and edit your current page</p>
                </div>
                <div className="h-[calc(100%-5rem)] m-6 overflow-auto">
                  <PageByPageEditor />
                </div>
              </div>

              {/* Preview Panel */}
              <div className="flex-1 bg-white dark:bg-gray-900">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-lg">Story Preview</h3>
                  <p className="text-sm text-muted-foreground">Live preview of your storybook</p>
                </div>
                <div className="h-[calc(100%-5rem)] m-6 overflow-auto">
                  <PageByPagePreview />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
