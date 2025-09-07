import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { GoogleGenAI } from "@google/genai";

// Load env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads as static files
app.use("/uploads", express.static(uploadsDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fieldSize: 10 * 1024 * 1024, // allow up to 10MB text fields
    fileSize: 20 * 1024 * 1024, // allow up to 20MB per file
  },
});

// Initialize Google GenAI client
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const contextapiKey =
  process.env.CONTEXT_GOOGLE_API_KEY || process.env.CONTEXT_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[WARN] GOOGLE_API_KEY not set. Set it in .env");
}
const genAI = new GoogleGenAI({ apiKey });
const ContextgenAI = new GoogleGenAI({ contextapiKey });

// Simple file upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }
    const url = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    return res.json({
      success: true,
      url,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error("[/upload] error", err);
    return res.status(500).json({ success: false, error: "Upload failed" });
  }
});

// Helpers
function fileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return data.toString("base64");
}

// Convert data URL to { mimeType, data } or null
function dataUrlToInlineData(dataUrl) {
  // data:[mime];base64,XXXX
  if (!dataUrl?.startsWith("data:")) return null;
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = /^data:([^;]+);base64$/.exec(meta);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  return { mimeType, data: base64 };
}

function toInlineImagePart({ base64, mimeType }) {
  return { inlineData: { mimeType, data: base64 } };
}

// Extract text from response
function extractTextFromResponse(resp) {
  // Try multiple shapes for robustness
  try {
    // @google/genai tends to return candidates[0].content.parts[].text
    const parts = resp?.candidates?.[0]?.content?.parts;
    const textPart = parts?.find((p) => typeof p?.text === "string");
    if (textPart?.text) return textPart.text;
  } catch {
    console.warn("Failed to extract from candidates[0].content.parts");
  }
  try {
    const text = resp?.contents?.[0]?.text;
    if (text) return text;
  } catch {
    console.warn("Failed to extract from resp.contents[0].text");
  }
  try {
    if (typeof resp?.output_text === "string") return resp.output_text;
  } catch {
    console.warn("Failed to extract from resp.output_text");
  }
  return "";
}

// Extract images from response
function extractImagesFromResponse(resp) {
  console.log("Extracting images from response:", resp);
  // Return array of { mimeType, data } from inlineData parts
  const out = [];
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p?.inlineData?.data) {
      out.push({
        mimeType: p.inlineData.mimeType || "image/png",
        data: p.inlineData.data,
      });
    }
  }
  return out;
}

// Divide full script into scenes
async function divideScriptIntoScenes(fullScript) {
  if (!fullScript || fullScript.trim().length === 0) {
    throw new Error("Full script is empty or undefined");
  }

  const sysPrompt = `You are a helpful assistant that divides a story script into scenes for storybook. 
  Do not shorten or overly simplify the content—just split the script into scenes and refine the language for clarity and flow. 
  
  Script:
  ${fullScript}
  
  Return the scenes as a JSON array of strings. Example:
  [
    "Scene 1: A bustling city street at dawn, filled with honking cars and vendors setting up stalls.",
    "Scene 2: A quiet park where children are playing and couples stroll under the trees.",
    "Scene 3: A cozy café where two friends meet and share a conversation over coffee."
  ]`;

  const response = await ContextgenAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: sysPrompt,
  });

  console.log("Raw divided scenes response:", response);

  const text = extractTextFromResponse(response);
  console.log("Divided scenes response text:", text);

  // Attempt to parse the text as JSON array of strings
  let scenes;

  // Helper: attempt JSON.parse with trimming
  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  // 1) Try direct parse
  scenes = tryParse(text);

  console.log("Initial parse attempt:", scenes);

  // 2) If failed, strip common markdown/fence wrappers like ```json ... ``` or ``` ... ```
  if (!Array.isArray(scenes)) {
    // Extract content inside triple backticks if present
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      const inner = fenceMatch[1].trim();
      scenes = tryParse(inner);
    }
  }
  console.log("After fence stripping parse attempt:", scenes);

  // 3) If still failed, try to extract the first JSON array found by locating the first '[' and the last ']' and parsing that slice
  if (!Array.isArray(scenes)) {
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      const candidate = text.slice(firstBracket, lastBracket + 1);
      scenes = tryParse(candidate);
    }
  }

  console.log("After bracket extraction parse attempt:", scenes);

  // 4) Give up with detailed error for debugging
  if (!Array.isArray(scenes)) {
    throw new Error(
      "Failed to parse scenes JSON: could not extract a valid JSON array" +
        "\nRaw: " +
        text
    );
  }

  return scenes;
}

// Generate page plan: enhanced content, image prompt, suggestions
async function generatePagePlan({ scene, globalContext }) {
  const prompt = `You are a professional storybook writer and illustrator.\n${
    globalContext
      ? `Global Context (apply consistently across prose and image prompt):\n${globalContext}\n`
      : ""
  }\nScene:\n${scene}\n\nReturn strict JSON with keys: enhancedContent (string), imagePrompt (string), suggestions (string[3]).`;

  const schemaHint = `Format:\n{\n  "enhancedContent": "...",\n  "imagePrompt": "...",\n  "suggestions": ["...","...","..."]\n}`;

  const response = await ContextgenAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${prompt}\n\n${schemaHint}`,
  });
  const text = extractTextFromResponse(response);
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    // fallback minimal structure
    obj = {
      enhancedContent: scene,
      imagePrompt: `Illustration of: ${scene}`,
      suggestions: [
        "Tighten pacing",
        "Add sensory detail",
        "Keep tone gentle and warm",
      ],
    };
  }
  obj.suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.slice(0, 3)
    : ["Improve clarity", "Add detail", "Ensure consistency"];
  return obj;
}

// generate image which may include referenceInlineParts for continuity
async function generateImage({ prompt, referenceInlineParts = [] }) {
  console.log("Generating the image");
  // Use an image-capable preview model. If unavailable, this will just not return images.
  const systemPrompt = `You are a professional book illustrator. Generate a high-quality, vibrant, and engaging illustration based on the prompt. Use the reference images to maintain visual continuity in style, color palette, and character appearance. Ensure the illustration is suitable for a storybook or comic book or graphic novel or based on user prompt
  Make sure if dialogue is present, it is clearly legible and integrated into the scene naturally. The illustration should be rich in detail, with a focus on creating an immersive and captivating visual experience for young readers.
  Make sure to make the illustration properly consistent with the previous image in terms of character look, style, and other visual elements—do not change these in the scene update; keep them the same.
  `;
  const parts = [
    { text: ` system: ${systemPrompt} \n\n user: ${prompt}` },
    ...referenceInlineParts,
  ];
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-image-preview", // per your earlier usage
    contents: parts,
  });
  const images = extractImagesFromResponse(response);
  if (images.length > 0) return images[0];
  return null;
}

// Generate cover plan: title/subtitle + image prompt
async function generateCoverPlan({ metadata = {}, globalContext = "" }) {
  const {
    title = "Untitled",
    author = "Unknown Author",
    description = "",
  } = metadata;
  const prompt = `You are a professional storybook cover designer.\n${
  globalContext
    ? `Global Context (apply consistently):\n${globalContext}\n`
    : ""
}
Book metadata:
- Title: ${title}
- Author: ${author}
- Description: ${description}

Return strict JSON with keys:
{ "coverTitle": string, "coverSubtitle": string, "imagePrompt": string }`;

  const resp = await ContextgenAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = extractTextFromResponse(resp);
  try {
    const obj = JSON.parse(text);
    return {
      coverTitle: obj.coverTitle || title,
      coverSubtitle: obj.coverSubtitle || "",
      imagePrompt:
        obj.imagePrompt ||
        `A illustration for "${title}"`,
    };
  } catch {
    return {
      coverTitle: title,
      coverSubtitle: "",
      imagePrompt: `A illustration for "${title}" by ${author}`,
    };
  }
}

app.post("/cover-generate", upload.single("userImage"), async (req, res) => {
  try {
    const meta = (() => {
      try {
        return JSON.parse(req.body?.metadata || "null");
      } catch {
        return null;
      }
    })() || {
      title: req.body?.title,
      author: req.body?.author,
      description: req.body?.description,
    };

    const globalContext = req.body?.globalContext || "";
    const prevImageDataUrl = req.body?.prevImage || null;

    const plan = await generateCoverPlan({ metadata: meta, globalContext });

    // reference images (user image or previous image) for continuity, if any
    const inlineRefs = [];
    if (req.file) {
      inlineRefs.push(
        toInlineImagePart({
          base64: fileToBase64(req.file.path),
          mimeType: req.file.mimetype || "image/png",
        })
      );
    }
    const prevInline = dataUrlToInlineData(prevImageDataUrl);
    if (prevInline) inlineRefs.push({ inlineData: prevInline });

    const finalImagePrompt = [
      globalContext ? `Global theme: ${globalContext}` : null,
      `Front cover art for the book "${plan.coverTitle}" by ${
        meta?.author || "Unknown Author"
      }.`,
      plan.imagePrompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    const image = await generateImage({
      prompt: finalImagePrompt,
      referenceInlineParts: inlineRefs,
    });

    res.json({
      success: true,
      cover: {
        title: plan.coverTitle,
        subtitle: plan.coverSubtitle,
        imagePrompt: finalImagePrompt,
        image: image
          ? {
              mimeType: image.mimeType,
              dataUrl: `data:${image.mimeType};base64,${image.data}`,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[cover-generate] error", err);
    res.status(500).json({ error: "Failed to generate cover" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function generateImageWithTimeout(args, timeoutMs = 30000) {
  return Promise.race([
    generateImage(args),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Image generation timeout")), timeoutMs)
    ),
  ]);
}

// Page-by-page generation: accepts multipart/form-data
// Fields (text): pageContent, imagePrompt, storyContext, pageNumber, totalPages, globalContext, prevImage (dataURL base64 optional)
// Files: userImage (optional)
app.post("/page-generate", upload.single("userImage"), async (req, res) => {
  try {
    const body = req.body || {};
    console.log(
      "Received /page-generate request with body:",
      body,
      "and file:",
      req.file
    );
    const pageContent = body.pageContent || "";
    const imagePromptIn = body.imagePrompt || "";
    const storyContext = body.storyContext || "";
    const pageNumber = Number(body.pageNumber || 1);
    const totalPages = Number(body.totalPages || 1);
    const globalContext = body.globalContext || "";
    const prevImageDataUrl = body.prevImage || null;
    const prevPageContent = body.prevPageContent || "";
    const prevPageImagePrompt = body.prevPageImagePrompt || "";

    if (!pageContent.trim()) {
      return res.status(400).json({ error: "pageContent is required" });
    }

    // Build plan (enhanced content + image prompt)
    const plan = await generatePagePlan({
      scene: `${storyContext ? storyContext + "\n" : ""}${pageContent}${
        imagePromptIn
          ? "\n" + "image description by the user:" + imagePromptIn
          : ""
      }`,
      globalContext,
    });

    console.log("Generated page plan:", plan);

    // Assemble reference images for continuity
    const inlineRefs = [];
    if (req.file) {
      inlineRefs.push(
        toInlineImagePart({
          base64: fileToBase64(req.file.path),
          mimeType: req.file.mimetype || "image/png",
        })
      );
    }
    const prevInline = dataUrlToInlineData(prevImageDataUrl);
    if (prevInline) inlineRefs.push({ inlineData: prevInline });

    const continuityBlock =
      prevPageContent || prevPageImagePrompt
        ? [
            "Previous page context (for strict continuity):",
            prevPageContent
              ? `- Previous enhanced content:\n${prevPageContent}`
              : null,
            prevPageImagePrompt
              ? `- Previous image prompt:\n${prevPageImagePrompt}`
              : null,
            "Do not change established character designs, outfits, UI theme, or visual style unless explicitly requested.",
          ]
            .filter(Boolean)
            .join("\n")
        : null;

    // Build final image prompt with continuity note
    const finalImagePrompt = [
      globalContext ? `Global theme: ${globalContext}` : null,
      plan.enhancedContent,
      imagePromptIn || plan.imagePrompt,
      prevInline ? "Maintain visual continuity with the previous image." : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    console.log("Final image prompt:", finalImagePrompt);
    console.log("Reference inline parts:", inlineRefs);

    const image = await generateImage({
      prompt: finalImagePrompt,
      referenceInlineParts: inlineRefs,
    });

    console.log("Generated image:", image);

    res.json({
      success: true,
      enhancedContent: plan.enhancedContent,
      imagePrompt: finalImagePrompt,
      suggestions: plan.suggestions,
      image: image
        ? {
            mimeType: image.mimeType,
            dataUrl: `data:${image.mimeType};base64,${image.data}`,
          }
        : null,
      pageNumber,
      totalPages,
    });
  } catch (err) {
    console.error("[page-generate] error", err);
    res.status(500).json({ error: "Failed to generate page" });
  }
});

// Whole story generation: accepts multipart/form-data
// Fields (text): metadata (JSON string optional), fullScript, scenes (JSON array optional), globalContext
// Files: userImage (optional)
app.post(
  "/whole-story-generate",
  upload.single("userImage"),
  async (req, res) => {
    try {
      console.log(
        "Received /whole-story-generate request with body:",
        req.body,
        "and file:",
        req.file
      );
      const metadata = (() => {
        try {
          return JSON.parse(req.body?.metadata || "null");
        } catch {
          return null;
        }
      })();
      const fullScript = req.body?.fullScript || "";
      const scenesIn = (() => {
        try {
          return JSON.parse(req.body?.scenes || "null");
        } catch {
          return null;
        }
      })();
      const globalContext = req.body?.globalContext || "";

      if (
        !fullScript.trim() &&
        (!Array.isArray(scenesIn) || scenesIn.length === 0)
      ) {
        return res.status(400).json({ error: "Provide fullScript or scenes" });
      }

      //  return
      let scenes = scenesIn;
      if (!Array.isArray(scenes) || scenes.length === 0) {
        scenes = await divideScriptIntoScenes(fullScript);
      }

      console.log("Using scenes:");
      // Initial reference image if provided
      const inlineRefsBase = [];
      if (req.file) {
        inlineRefsBase.push(
          toInlineImagePart({
            base64: fileToBase64(req.file.path),
            mimeType: req.file.mimetype || "image/png",
          })
        );
      }

      const coverPlan = await generateCoverPlan({ metadata, globalContext });
      const coverPrompt = [
        globalContext ? `Global theme: ${globalContext}` : null,
        `Front cover art for the book "${
          coverPlan.coverTitle || metadata?.title || "Untitled"
        }" by ${metadata?.author || "Unknown Author"}.`,
        coverPlan.imagePrompt,
      ]
        .filter(Boolean)
        .join("\n\n");

      let coverImage = null;
      try {
        coverImage = await generateImage(
          { prompt: coverPrompt, referenceInlineParts: inlineRefsBase }
        );
      } catch (err) {
        console.error(
          "[whole-story-generate] Cover image generation failed:",
          err
        );
      }

      const pages = [];
      let lastImageInline = coverImage
        ? {
            inlineData: {
              mimeType: coverImage.mimeType,
              data: coverImage.data,
            },
          }
        : inlineRefsBase[0] || null;

      for (let i = 0; i < scenes.length; i++) {
        console.log(
          `[whole-story-generate] Generating page ${i + 1}/${scenes.length}`
        );
        const scene = scenes[i];
        const plan = await generatePagePlan({ scene, globalContext });

        const prevEnhanced = pages[i - 1]?.pageContent || "";
        const prevPrompt = pages[i - 1]?.imagePrompt || "";

        const continuityBlock =
          prevEnhanced || prevPrompt
            ? [
                "Previous page context (for strict continuity):",
                prevEnhanced
                  ? `- Previous enhanced content:\n${prevEnhanced}`
                  : null,
                prevPrompt ? `- Previous image prompt:\n${prevPrompt}` : null,
                "Do not change established character designs, outfits, UI theme, or visual style unless explicitly requested.",
              ]
                .filter(Boolean)
                .join("\n")
            : null;

  const prompt = [
    globalContext ? `Global theme: ${globalContext}` : null,
    continuityBlock,
    plan.imagePrompt,
    lastImageInline ? "Maintain visual continuity with the previous image." : null,
  ]
          .filter(Boolean)
          .join("\n\n");

        let image = null;
        try {
          image = await generateImageWithTimeout(
            {
              prompt,
              referenceInlineParts: lastImageInline
                ? [lastImageInline]
                : inlineRefsBase,
            },
            30000
          );

          if (image) {
            lastImageInline = {
              inlineData: { mimeType: image.mimeType, data: image.data },
            };
          }
        } catch (err) {
          console.error(
            `[whole-story-generate] Image generation failed for page ${i + 1}:`,
            err
          );
        }

        pages.push({
          pageNumber: i + 1,
          pageContent: plan.enhancedContent,
          imagePrompt: prompt,
          image: image
            ? {
                mimeType: image.mimeType,
                dataUrl: `data:${image.mimeType};base64,${image.data}`,
              }
            : null,
        });
      }

      res.json({
        success: true,
        metadata,
        globalContext,
        cover: {
          title: coverPlan.coverTitle,
          subtitle: coverPlan.coverSubtitle,
          imagePrompt: coverPrompt,
          image: coverImage
            ? {
                mimeType: coverImage.mimeType,
                dataUrl: `data:${coverImage.mimeType};base64,${coverImage.data}`,
              }
            : null,
        },
        totalPages: pages.length,
        pages,
      });
    } catch (err) {
      console.error("[whole-story-generate] error", err);
      res.status(500).json({ error: "Failed to generate story" });
    }
  }
);

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
