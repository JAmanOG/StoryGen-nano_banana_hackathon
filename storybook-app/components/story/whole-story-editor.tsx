"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Plus, Trash2, Edit, Save, Wand2, FileText, Layers, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateWholeStory } from "@/lib/story-generation"

interface StoryMetadata {
  title: string
  author: string
  description: string
  genre: string
  targetAge: string
}

interface Scene {
  id: string
  title: string
  content: string
  imagePrompt: string
  pageNumber: number
  imageUrl?: string
}

interface Story {
  metadata: StoryMetadata
  fullScript: string
  scenes: Scene[]
  isGenerated: boolean
}

export function WholeStoryEditor() {
  const [story, setStory] = useState<Story>({
    metadata: {
      title: "",
      author: "",
      description: "",
      genre: "",
      targetAge: "",
    },
    fullScript: "",
    scenes: [],
    isGenerated: false,
  })

  const [activeTab, setActiveTab] = useState("metadata")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const { toast } = useToast()

  // Derived flags for contextual generation
  const hasTitle = !!story.metadata.title?.trim()
  const canGenerateFromScript = hasTitle && story.fullScript.trim().length > 0
  const canGenerateFromScenes = hasTitle && story.scenes.length > 0 && story.scenes.some((s) => (s.content?.trim()?.length || 0) > 0)
  const canGenerate = activeTab === "script" ? canGenerateFromScript : activeTab === "scenes" ? canGenerateFromScenes : false
  const canEdit = !story.isGenerated

  const handleMetadataChange = (field: keyof StoryMetadata, value: string) => {
    console.log("[Whole] Metadata change", { field, value })
    setStory((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [field]: value },
    }))
  }

  const handleAddScene = () => {
    console.log("[Whole] Add scene", { nextPage: story.scenes.length + 1 })
    const newScene: Scene = {
      id: Date.now().toString(),
      title: `Scene ${story.scenes.length + 1}`,
      content: "",
      imagePrompt: "",
      pageNumber: story.scenes.length + 1,
    }
    setStory((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }))
  }

  const handleUpdateScene = (sceneId: string, field: keyof Scene, value: string | number) => {
    console.log("[Whole] Update scene", { sceneId, field, value })
    setStory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene) => (scene.id === sceneId ? { ...scene, [field]: value } : scene)),
    }))
  }

  const handleDeleteScene = (sceneId: string) => {
    console.log("[Whole] Delete scene", { sceneId })
    setStory((prev) => ({
      ...prev,
      scenes: prev.scenes
        .filter((scene) => scene.id !== sceneId)
        .map((scene, index) => ({ ...scene, pageNumber: index + 1 })),
    }))
  }

  const handleSaveStory = () => {
    console.log("[Whole] Save story", {
      title: story.metadata.title,
      scenes: story.scenes.length,
      words: story.fullScript.split(" ").filter(Boolean).length,
    })
    // Save story to local storage or backend
    localStorage.setItem("wholeStory", JSON.stringify(story))
    // Notify any preview components in the same window to reload
    try {
      window.dispatchEvent(new Event("wholeStoryUpdated"))
    } catch (e) {
      console.warn("[Whole] Could not dispatch wholeStoryUpdated event", e)
    }
    toast({
      title: "Story Saved",
      description: "Your story has been saved successfully.",
    })
  }

  const handleGenerateStorybook = async () => {
    console.log("[Whole] Generate story clicked", { activeTab })

    // Title is required regardless of source
    if (!hasTitle) {
      toast({
        title: "Missing Title",
        description: "Please provide a story title before generating.",
        variant: "destructive",
      })
      return
    }

    // Validate based on active section
    if (activeTab === "script") {
      if (!canGenerateFromScript) {
        toast({
          title: "Missing Script",
          description: "Please write your full script before generating from the Full Script tab.",
          variant: "destructive",
        })
        return
      }
    } else if (activeTab === "scenes") {
      if (!canGenerateFromScenes) {
        toast({
          title: "No Scenes",
          description: "Add at least one scene with content before generating from the Scene Breakdown tab.",
          variant: "destructive",
        })
        return
      }
    } else {
      // If user is on metadata, don't allow generate
      toast({
        title: "Select a Section",
        description: "Switch to Full Script or Scene Breakdown to generate.",
      })
      return
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      // Build payload based on active tab
      const payload = {
        metadata: story.metadata,
        fullScript: activeTab === "script" ? story.fullScript : "",
        scenes: activeTab === "scenes" ? story.scenes : [],
      }

      console.log("[Whole] POST /api/generate-story payload", {
        title: payload.metadata.title,
        source: activeTab,
        scenes: payload.scenes.length,
        scriptChars: payload.fullScript.length,
      })

      const result = await generateWholeStory(payload)
      console.log("[Whole] /api/generate-story result", result)

      if (result.success && result.scenes) {
        // Build a new story object (use current story for ids if available)
        const newScenes = result.scenes!.map((scene, index) => ({
          id: story.scenes[index]?.id || `scene-${Date.now()}-${index}`,
          title: scene.title,
          content: scene.content,
          imagePrompt: scene.imagePrompt,
          pageNumber: scene.pageNumber,
          imageUrl: scene.imageUrl,
        }))

        const newStory = {
          ...story,
          fullScript: result.enhancedScript || story.fullScript,
          scenes: newScenes,
          isGenerated: true,
        }

        // Update state and persist so preview can pick up the changes
        setStory(newStory)
        console.log("newStory",newStory)
        try {
          localStorage.setItem("wholeStory", JSON.stringify(newStory))
          window.dispatchEvent(new Event("wholeStoryUpdated"))
          console.log("[PBP] Story persisted and preview notified after adding page")
        } catch (e) {
          console.error("[Whole] Failed to persist generated story", e)
        }

        toast({
          title: "Storybook Generated!",
          description: "Your complete storybook has been generated successfully with AI enhancements.",
        })
      } else {
        setGenerationError(result.error || "Failed to generate story")
        toast({
          title: "Generation Failed",
          description: result.error || "Something went wrong while generating your storybook.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("[Whole] Generation error", err)
      setGenerationError("Network error. Please try again.")
      toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Story Editor</h2>
          <p className="text-gray-600 dark:text-gray-300">Create your complete storybook</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={handleSaveStory} variant="outline" className="gap-2 bg-transparent">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}
          {canEdit ? (
            <Button onClick={handleGenerateStorybook} disabled={isGenerating || !canGenerate} className="gap-2">
              {isGenerating ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Storybook
                </>
              )}
            </Button>
          ) : (
            <Badge variant="secondary" className="px-4 py-2">
              <BookOpen className="h-4 w-4 mr-2" />
              Generated
            </Badge>
          )}
        </div>
      </div>

      {generationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      {story.isGenerated && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Storybook Generated Successfully!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Your storybook has been enhanced with AI and is ready for preview and download. No further edits are
              allowed.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(tab) => { console.log("[Whole] Switch tab", { from: activeTab, to: tab }); setActiveTab(tab) }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metadata" className="gap-2">
            <FileText className="h-4 w-4" />
            Story Info
          </TabsTrigger>
          <TabsTrigger value="script" className="gap-2">
            <Edit className="h-4 w-4" />
            Full Script
          </TabsTrigger>
          <TabsTrigger value="scenes" className="gap-2">
            <Layers className="h-4 w-4" />
            Scene Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Story Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Story Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter story title..."
                    value={story.metadata.title}
                    onChange={(e) => handleMetadataChange("title", e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    placeholder="Author name..."
                    value={story.metadata.author}
                    onChange={(e) => handleMetadataChange("author", e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your story..."
                  value={story.metadata.description}
                  onChange={(e) => handleMetadataChange("description", e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    placeholder="Fantasy, Adventure, etc."
                    value={story.metadata.genre}
                    onChange={(e) => handleMetadataChange("genre", e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="targetAge">Target Age</Label>
                  <Input
                    id="targetAge"
                    placeholder="3-5 years, 6-8 years, etc."
                    value={story.metadata.targetAge}
                    onChange={(e) => handleMetadataChange("targetAge", e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Story Script</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write your complete story here... This will be used to generate the entire storybook."
                value={story.fullScript}
                onChange={(e) => setStory((prev) => ({ ...prev, fullScript: e.target.value }))}
                disabled={!canEdit}
                rows={20}
                className="min-h-[500px] font-mono text-sm"
              />
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {story.fullScript.length} characters • {story.fullScript.split(" ").filter(Boolean).length} words
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scene Breakdown</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Define individual pages and scenes for your storybook
                  </p>
                </div>
                {canEdit && (
                  <Button onClick={handleAddScene} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Scene
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {story.scenes.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No scenes defined</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Add scenes to break your story into individual pages
                  </p>
                  {canEdit && (
                    <Button onClick={handleAddScene} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add First Scene
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {story.scenes.map((scene, index) => (
                      <Card key={scene.id} className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Page {scene.pageNumber}</Badge>
                                <Input
                                  placeholder="Scene title..."
                                  value={scene.title}
                                  onChange={(e) => handleUpdateScene(scene.id, "title", e.target.value)}
                                  disabled={!canEdit}
                                  className="font-medium"
                                />
                              </div>

                              <Textarea
                                placeholder="Scene content/dialogue..."
                                value={scene.content}
                                onChange={(e) => handleUpdateScene(scene.id, "content", e.target.value)}
                                disabled={!canEdit}
                                rows={3}
                              />

                              <Input
                                placeholder="Image description/prompt for this scene..."
                                value={scene.imagePrompt}
                                onChange={(e) => handleUpdateScene(scene.id, "imagePrompt", e.target.value)}
                                disabled={!canEdit}
                              />
                            </div>

                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteScene(scene.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* temp display images from the response */}
      <div className="image-display">
              {
                story.scenes.map((scene) => (
                  <img key={scene.id} src={scene.imageUrl} alt={scene.imagePrompt} className="w-full h-auto" />
                ))
              }
      </div>
    </div>
  )
}
