import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const pageGenerationSchema = z.object({
  enhancedContent: z.string(),
  imagePrompt: z.string(),
  suggestions: z.array(z.string()),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Received body:", body)
    const { pageContent, imagePrompt, storyContext, pageNumber, totalPages, globalContext } = body

    console.log("[API] /api/generate-page request", {
      pageChars: typeof pageContent === "string" ? pageContent.length : 0,
      hasImagePrompt: !!imagePrompt,
      pageNumber,
      totalPages,
      hasContext: !!storyContext,
      hasGlobalContext: !!globalContext,
    })

    if (!pageContent || pageContent.trim().length === 0) {
      return NextResponse.json({ error: "Page content is required" }, { status: 400 })
    }

    // Generate enhanced page content
    const { object: generatedPage } = await generateObject({
      model: openai("gpt-4"),
      schema: pageGenerationSchema,
      prompt: `
        You are a professional children's storybook writer and illustrator.
        ${globalContext ? `\nGlobal Context (apply consistently across this page's prose and image prompt):\n${globalContext}\n` : ""}
        Story Context:
        ${storyContext || "This is a standalone page in a children's storybook."}
        
        Current Page: ${pageNumber} of ${totalPages}
        
        Original Page Content:
        ${pageContent}
        
        Original Image Prompt:
        ${imagePrompt || "No image description provided"}
        
        Please:
        1. Enhance and polish the page content while maintaining its core message and narrative
        2. Make the language engaging, age-appropriate, and suitable for a children's storybook
        3. Ensure the content flows well and is the right length for a single storybook page
        4. Create or enhance the image prompt to be detailed and vivid for illustration
        5. Provide 3 helpful suggestions for further improving this page
        
        The enhanced content should be engaging but not too long for a single page.
        The image prompt should specify artistic style and include rich visual details.
      `,
    })

    console.log("[API] /api/generate-page response", {
      enhancedChars: generatedPage?.enhancedContent?.length,
      hasImagePrompt: !!generatedPage?.imagePrompt,
      suggestions: generatedPage?.suggestions?.length,
    })

    return NextResponse.json({
      success: true,
      enhancedContent: generatedPage.enhancedContent,
      imagePrompt: generatedPage.imagePrompt,
      suggestions: generatedPage.suggestions,
    })
  } catch (error) {
    console.error("[API] Page generation error", error)
    return NextResponse.json({ error: "Failed to generate page. Please try again." }, { status: 500 })
  }
}
