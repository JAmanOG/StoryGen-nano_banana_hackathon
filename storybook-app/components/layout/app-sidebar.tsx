"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Archive, Edit, Eye, Home } from "lucide-react"
import Link from "next/link"

interface AppSidebarProps {
  currentView: "vault" | "editor" | "preview"
  mode: "whole" | "page-by-page"
  onViewChange: (view: "vault" | "editor" | "preview") => void
}

export function AppSidebar({ currentView, mode, onViewChange }: AppSidebarProps) {
  const navigation = [
    {
      id: "vault" as const,
      name: "Global Context",
      icon: Archive,
      description: "Reusable instructions and assets",
    },
    {
      id: "editor" as const,
      name: mode === "whole" ? "Story Editor" : "Page Editor",
      icon: Edit,
      description: mode === "whole" ? "Write full story" : "Edit current page",
    },
    {
      id: "preview" as const,
      name: mode === "whole" ? "Preview" : "Story Preview",
      icon: Eye,
      description: mode === "whole" ? "Preview storybook" : "View current story",
    },
  ]

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/">
          <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto p-3",
                  currentView === item.id && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300",
                )}
                onClick={() => { console.log("[Sidebar] Change view", { mode, from: currentView, to: item.id }); onViewChange(item.id) }}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </Button>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
