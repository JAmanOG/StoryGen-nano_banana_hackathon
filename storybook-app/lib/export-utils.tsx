export interface ExportOptions {
  format: "html_download" | "html_print_pdf" | "images_print_pdf"| "images_zip" | "json"
  includeImages: boolean
  pageSize?: "a4" | "letter" | "custom"
  fontSize?: "small" | "medium" | "large"
}

export interface StoryExportData {
  metadata: {
    title: string
    author: string
    description: string
    genre: string
    targetAge: string
    exportedAt: string
    format: string
  }
  cover?: {
    title: string
    subtitle?: string
    imageUrl?: string
    imagePrompt?: string
  }
  content: Array<{
    pageNumber: number
    title: string
    content: string
    imagePrompt: string
    imageUrl?: string
  }>
  stats: {
    totalPages: number
    totalWords: number
    generatedPages?: number
  }
}

export function generateHTMLExport(storyData: StoryExportData, options: ExportOptions): string {
  const fontSize = options.fontSize === "small" ? "14px" : options.fontSize === "large" ? "20px" : "16px"
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${storyData.metadata.title}</title>
<style>
    body {
        font-family: 'Georgia', serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
        font-size: ${fontSize};
        color: #333;
    }
    .cover {
        text-align: center;
        page-break-after: always;
        margin-bottom: 60px;
    }
    .cover h1 {
        font-size: 2.5em;
        margin-bottom: 10px;
        color: #2c3e50;
    }
    .cover .subtitle {
        font-size: 1.2em;
        color: #5d6d7e;
        margin-bottom: 10px;
    }
    .cover .author {
        font-size: 1.1em;
        color: #7f8c8d;
        margin-bottom: 20px;
    }
    .cover .metadata {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        display: inline-block;
    }
    .cover .image {
        margin: 0 auto 20px;
        width: 400px;   /* fixed width */
        height: 300px;  /* fixed height */
        object-fit: contain; /* keeps aspect ratio inside box */
        display: block;
    }
    .page {
        page-break-before: always;
        margin-bottom: 40px;
    }
    .page-title {
        font-size: 1.5em;
        margin-bottom: 20px;
        color: #34495e;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
    }
    .page-content {
        margin-bottom: 30px;
        text-align: justify;
    }
    .image-placeholder {
        background: #ecf0f1;
        border: 2px dashed #bdc3c7;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        margin: 20px 0;
        color: #7f8c8d;
        font-style: italic;
    }
    .image-placeholder img {
        width: 600px;   /* fixed width */
        height: 500px;  /* fixed height */
        object-fit: contain;
    }
    @media print {
        body { margin: 0; padding: 20px; }
        .page { page-break-before: always; }
    }
</style>
</head>
<body>
    <div class="cover">
        ${options.includeImages && storyData.cover?.imageUrl ? `<img class="image" src="${storyData.cover.imageUrl}" alt="${storyData.cover.imagePrompt || 'Cover'}" />` : ''}
        <h1>${storyData.cover?.title || storyData.metadata.title}</h1>
        ${storyData.cover?.subtitle ? `<div class="subtitle">${storyData.cover.subtitle}</div>` : ''}
        ${storyData.metadata.author ? `<div class="author">by ${storyData.metadata.author}</div>` : ""}
        <div class="metadata">
            ${storyData.metadata.description ? `<p><strong>Description:</strong> ${storyData.metadata.description}</p>` : ""}
            ${storyData.metadata.genre ? `<p><strong>Genre:</strong> ${storyData.metadata.genre}</p>` : ""}
            ${storyData.metadata.targetAge ? `<p><strong>Target Age:</strong> ${storyData.metadata.targetAge}</p>` : ""}
            <p><strong>Pages:</strong> ${storyData.stats.totalPages}</p>
            <p><strong>Words:</strong> ${storyData.stats.totalWords}</p>
        </div>
    </div>
    
    ${storyData.content
      .map(
        (page) => `
        <div class="page">
            <h2 class="page-title">${page.title}</h2>
            ${
              options.includeImages && page.imagePrompt
                ? `
                <div class="image-placeholder">
                    ${page.imageUrl ? `<img src="${page.imageUrl}" alt="${page.imagePrompt}" style="max-width: 100%; height: auto;">` : `Image: ${page.imagePrompt}`}
                </div>
            `
                : ""
            }
            <div class="page-content">
                ${page.content
                .split("image description by the user:")[0]
                  .split("\n")
                  .map((paragraph) => `<p>${paragraph}</p>`)
                  .join("")}
            </div>
        </div>
    `,
      )
      .join("")}
</body>
</html>`
}

export function generateTextExport(storyData: StoryExportData): string {
  let text = `${storyData.cover?.title || storyData.metadata.title}\n`
  if (storyData.cover?.subtitle) {
    text += `${storyData.cover.subtitle}\n`
  }
  if (storyData.metadata.author) {
    text += `by ${storyData.metadata.author}\n`
  }
  text += `\n${"=".repeat(50)}\n\n`

  if (storyData.metadata.description) {
    text += `${storyData.metadata.description}\n\n`
  }

  storyData.content.forEach((page) => {
    text += `\n--- ${page.title} ---\n\n`
    text += `${page.content}\n`
    if (page.imagePrompt) {
      text += `\n[Image: ${page.imagePrompt}]\n`
    }
    text += "\n"
  })

  return text
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()
}
