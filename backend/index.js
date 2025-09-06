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

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});
const upload = multer({ storage });

// Initialize Google GenAI client
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[WARN] GOOGLE_API_KEY not set. Set it in .env");
}
const genAI = new GoogleGenAI({ apiKey });

// Helpers
function fileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return data.toString("base64");
}

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

function extractTextFromResponse(resp) {
  // Try multiple shapes for robustness
  try {
    // @google/genai tends to return candidates[0].content.parts[].text
    const parts = resp?.candidates?.[0]?.content?.parts;
    const textPart = parts?.find((p) => typeof p?.text === "string");
    if (textPart?.text) return textPart.text;
  } catch {}
  try {
    const text = resp?.contents?.[0]?.text;
    if (text) return text;
  } catch {}
  try {
    if (typeof resp?.output_text === "string") return resp.output_text;
  } catch {}
  return "";
}

function extractImagesFromResponse(resp) {
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

async function divideScriptIntoScenes(fullScript) {
  if (!fullScript || fullScript.trim().length === 0) {
    throw new Error("Full script is empty or undefined");
  }

  const sysPrompt = `You are a helpful assistant that divides a children's story script into scenes. Each scene should be concise and focused on a single event or setting.\n\nScript:\n${fullScript}\n\nReturn the scenes as a JSON array of short strings. Example:\n[\n  "Scene 1: A bustling city street at dawn.",\n  "Scene 2: A quiet park with children playing.",\n  "Scene 3: A cozy café where two friends meet."\n]`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: sysPrompt,
  });

  const text = extractTextFromResponse(response);
  let scenes;
  try {
    scenes = JSON.parse(text);
    if (!Array.isArray(scenes)) throw new Error("Parsed scenes is not an array");
  } catch (err) {
    throw new Error("Failed to parse scenes JSON: " + (err?.message || String(err)) + "\nRaw: " + text);
  }
  return scenes;
}

async function generatePagePlan({ scene, globalContext }) {
  const prompt = `You are a professional children's storybook writer and illustrator.\n${globalContext ? `Global Context (apply consistently across prose and image prompt):\n${globalContext}\n` : ""}\nScene:\n${scene}\n\nReturn strict JSON with keys: enhancedContent (string), imagePrompt (string), suggestions (string[3]).`;

  const schemaHint = `Format:\n{\n  "enhancedContent": "...",\n  "imagePrompt": "...",\n  "suggestions": ["...","...","..."]\n}`;

  const response = await genAI.models.generateContent({
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

async function generateImage({ prompt, referenceInlineParts = [] }) {
  // Use an image-capable preview model. If unavailable, this will just not return images.
  const parts = [
    { text: prompt },
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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Page-by-page generation: accepts multipart/form-data
// Fields (text): pageContent, imagePrompt, storyContext, pageNumber, totalPages, globalContext, prevImage (dataURL base64 optional)
// Files: userImage (optional)
app.post("/page-generate", upload.single("userImage"), async (req, res) => {
  try {
    const body = req.body || {};
    const pageContent = body.pageContent || "";
    const imagePromptIn = body.imagePrompt || "";
    const storyContext = body.storyContext || "";
    const pageNumber = Number(body.pageNumber || 1);
    const totalPages = Number(body.totalPages || 1);
    const globalContext = body.globalContext || "";
    const prevImageDataUrl = body.prevImage || null;

    if (!pageContent.trim()) {
      return res.status(400).json({ error: "pageContent is required" });
    }

    // Build plan (enhanced content + image prompt)
    const plan = await generatePagePlan({
      scene: `${storyContext ? storyContext + "\n" : ""}${pageContent}`,
      globalContext,
    });

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

    // Build final image prompt with continuity note
    const finalImagePrompt = [
      globalContext ? `Global theme: ${globalContext}` : null,
      imagePromptIn || plan.imagePrompt,
      prevInline ? "Maintain visual continuity with the previous image." : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const image = await generateImage({
      prompt: finalImagePrompt,
      referenceInlineParts: inlineRefs,
    });

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
app.post("/whole-story-generate", upload.single("userImage"), async (req, res) => {
  try {
    const metadata = (() => {
      try { return JSON.parse(req.body?.metadata || "null"); } catch { return null; }
    })();
    const fullScript = req.body?.fullScript || "";
    const scenesIn = (() => {
      try { return JSON.parse(req.body?.scenes || "null"); } catch { return null; }
    })();
    const globalContext = req.body?.globalContext || "";

    if (!fullScript.trim() && (!Array.isArray(scenesIn) || scenesIn.length === 0)) {
      return res.status(400).json({ error: "Provide fullScript or scenes" });
    }

    let scenes = scenesIn;
    if (!Array.isArray(scenes) || scenes.length === 0) {
      scenes = await divideScriptIntoScenes(fullScript);
    }

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

    const pages = [];
    let lastImageInline = inlineRefsBase[0] || null;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const plan = await generatePagePlan({ scene, globalContext });

      const prompt = [
        globalContext ? `Global theme: ${globalContext}` : null,
        plan.imagePrompt,
        lastImageInline ? "Maintain visual continuity with the previous image." : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const image = await generateImage({
        prompt,
        referenceInlineParts: lastImageInline ? [lastImageInline] : inlineRefsBase,
      });

      if (image) {
        lastImageInline = { inlineData: { mimeType: image.mimeType, data: image.data } };
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
      totalPages: pages.length,
      pages,
    });
  } catch (err) {
    console.error("[whole-story-generate] error", err);
    res.status(500).json({ error: "Failed to generate story" });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});

