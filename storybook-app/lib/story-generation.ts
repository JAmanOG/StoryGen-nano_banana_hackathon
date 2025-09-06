export interface GenerationResult {
  success: boolean
  error?: string
  enhancedScript?: string
  scenes?: Array<{
    title: string
    content: string
    imagePrompt: string
    pageNumber: number
    imageUrl?: string
  }>
  enhancedContent?: string
  imagePrompt?: string
  suggestions?: string[]
  imageDataUrl?: string
}

// Build a concise Global Context string from localStorage entries saved by GlobalVault
function buildGlobalContext(): string | undefined {
  try {
    if (typeof window === "undefined") return undefined
    const raw = localStorage.getItem("globalContextItems")
    if (!raw) return undefined
    const items: any[] = JSON.parse(raw)
    if (!Array.isArray(items) || items.length === 0) return undefined

    const textItems = items.filter((i) => i.type === "text")
    const imageItems = items.filter((i) => i.type === "image")

    const lines: string[] = []
    if (textItems.length) {
      lines.push("Text Snippets:")
      for (const it of textItems.slice(0, 20)) {
        const tags = Array.isArray(it.tags) && it.tags.length ? ` [tags: ${it.tags.join(", ")}]` : ""
        lines.push(`- ${it.title || "Untitled"}${tags}: ${String(it.content || "").slice(0, 500)}`)
      }
    }
    if (imageItems.length) {
      lines.push("Image References:")
      for (const it of imageItems.slice(0, 20)) {
        const tags = Array.isArray(it.tags) && it.tags.length ? ` [tags: ${it.tags.join(", ")}]` : ""
        lines.push(`- ${it.title || "Untitled"}${tags}: ${it.content || "(no url)"}`)
      }
    }

    return lines.join("\n")
  } catch (e) {
    console.warn("[Story Gen] Failed to build global context", e)
    return undefined
  }
}

// Use the external Node backend instead of Next.js API routes
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

function toFormData(obj: Record<string, any>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    if (typeof v === "object" && !(v instanceof Blob)) {
      fd.append(k, JSON.stringify(v))
    } else {
      fd.append(k, v as any)
    }
  }
  return fd
}

export async function generateWholeStory(storyData: {
  metadata: {
    title: string
    author: string
    description: string
    genre: string
    targetAge: string
  }
  fullScript: string
  scenes: Array<{
    id: string
    title: string
    content: string
    imagePrompt: string
    pageNumber: number
  }>
}): Promise<GenerationResult> {
  try {
    const globalContext = buildGlobalContext()

    const body = toFormData({
      metadata: storyData.metadata,
      fullScript: storyData.fullScript,
      scenes: storyData.scenes.map((s) => ({ title: s.title, content: s.content, imagePrompt: s.imagePrompt, pageNumber: s.pageNumber })),
      globalContext,
    })

    const response = await fetch(`${BACKEND_URL}/whole-story-generate`, {
      method: "POST",
      body,
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to generate story",
      }
    }

    // Map backend shape to existing UI contract
    // Backend returns: { pages: [{ pageNumber, pageContent, imagePrompt, image? }], totalPages, ... }
    const pages = Array.isArray(result.pages) ? result.pages : []
    const scenes = pages.map((p: any) => ({
      title: `Page ${p.pageNumber}`,
      content: String(p.pageContent || ""),
      imagePrompt: String(p.imagePrompt || ""),
      pageNumber: Number(p.pageNumber || 0),
      imageUrl: p.image?.dataUrl,
    }))

    const enhancedScript = scenes.map((s:any) => s.content).join("\n\n")

    return {
      success: true,
      enhancedScript,
      scenes,
    }
  } catch (error) {
    console.error("Story generation error:", error)
    return {
      success: false,
      error: "Network error. Please check your connection and try again.",
    }
  }
}

export async function generateSinglePage(pageData: {
  pageContent: string
  imagePrompt: string
  storyContext?: string
  pageNumber: number
  totalPages: number
  prevImageDataUrl?: string
}): Promise<GenerationResult> {
  try {
    const globalContext = buildGlobalContext()

    const body = toFormData({
      pageContent: pageData.pageContent,
      imagePrompt: pageData.imagePrompt,
      storyContext: pageData.storyContext,
      pageNumber: String(pageData.pageNumber),
      totalPages: String(pageData.totalPages),
      globalContext,
      prevImage: pageData.prevImageDataUrl,
    })

    const response = await fetch(`${BACKEND_URL}/page-generate`, {
      method: "POST",
      body,
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to generate page",
      }
    }

    return {
      success: true,
      enhancedContent: result.enhancedContent,
      imagePrompt: result.imagePrompt,
      suggestions: result.suggestions,
      imageDataUrl: result.image?.dataUrl,
    }
  } catch (error) {
    console.error("Page generation error:", error)
    return {
      success: false,
      error: "Network error. Please check your connection and try again.",
    }
  }
}
