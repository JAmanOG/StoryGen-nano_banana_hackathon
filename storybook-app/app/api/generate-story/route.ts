import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const storyGenerationSchema = z.object({
  scenes: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      imagePrompt: z.string(),
      pageNumber: z.number(),
    }),
  ),
  enhancedScript: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metadata, fullScript, scenes, globalContext } = body

    console.log("[API] /api/generate-story request", {
      title: metadata?.title,
      scenes: Array.isArray(scenes) ? scenes.length : 0,
      scriptChars: typeof fullScript === "string" ? fullScript.length : 0,
      hasGlobalContext: !!globalContext,
    })

    if (!fullScript || fullScript.trim().length === 0) {
      return NextResponse.json({ error: "Story script is required" }, { status: 400 })
    }

    // Generate enhanced story content and scenes
    const { object: generatedStory } = await generateObject({
      model: openai("gpt-4"),
      schema: storyGenerationSchema,
      prompt: `
        You are a professional children's storybook writer and illustrator. 
        ${globalContext ? `\nGlobal Context (apply consistently across script and scenes):\n${globalContext}\n` : ""}
        Story Metadata:
        - Title: ${metadata.title || "Untitled Story"}
        - Author: ${metadata.author || "Unknown"}
        - Genre: ${metadata.genre || "General"}
        - Target Age: ${metadata.targetAge || "All ages"}
        - Description: ${metadata.description || "No description"}
        
        Original Story Script:
        ${fullScript}
        
        Existing Scene Breakdown (${scenes.length} scenes):
        ${scenes
          .map(
            (scene: any, index: number) => `
        Scene ${index + 1}: ${scene.title}
        Content: ${scene.content}
        Image Prompt: ${scene.imagePrompt}
        `,
          )
          .join("\n")}
        
        Please:
        1. Enhance and polish the original story script while maintaining its core narrative
        2. Create ${scenes.length > 0 ? scenes.length : 6} engaging scenes that work well as storybook pages
        3. Write compelling, age-appropriate content for each scene
        4. Generate detailed, vivid image prompts that would create beautiful storybook illustrations
        5. Ensure the story flows naturally from scene to scene
        6. Make the language engaging and suitable for the target age group
        
        Each scene should be substantial enough to fill a storybook page but not overwhelming.
        Image prompts should be detailed and specify style (e.g., "watercolor illustration", "digital art", "cartoon style").
      `,
    })

    console.log("[API] /api/generate-story response", {
      scenes: generatedStory?.scenes?.length,
      enhancedScriptChars: generatedStory?.enhancedScript?.length,
    })

    return NextResponse.json({
      success: true,
      enhancedScript: generatedStory.enhancedScript,
      scenes: generatedStory.scenes,
    })
  } catch (error) {
    console.error("Story generation error:", error)
    return NextResponse.json({ error: "Failed to generate story. Please try again." }, { status: 500 })
  }
}
