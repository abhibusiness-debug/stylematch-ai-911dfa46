import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const GEMINI_IMAGE_MODELS = ["gemini-2.5-flash-image", "gemini-3.1-flash-image-preview"];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const extractInlineImage = (
  node: unknown,
): { data: string; mimeType: string } | null => {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = extractInlineImage(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const inlineData = record.inlineData ?? record.inline_data;
  if (inlineData && typeof inlineData === "object") {
    const imageRecord = inlineData as Record<string, unknown>;
    const data = imageRecord.data;
    const mimeType = imageRecord.mimeType ?? imageRecord.mime_type;
    if (typeof data === "string" && data.length > 0) {
      return { data, mimeType: typeof mimeType === "string" ? mimeType : "image/png" };
    }
  }
  for (const value of Object.values(record)) {
    const found = extractInlineImage(value);
    if (found) return found;
  }
  return null;
};

const buildImagePrompt = (description: string) =>
  `Create a realistic front-view full outfit reference image for virtual try-on. ` +
  `Show the complete look described here: ${description}. ` +
  `Include top, bottom, footwear, and accessories as one coordinated outfit. ` +
  `Use a plain white studio background, full-body composition, catalog quality, no props, no text.`;

// Method 1: Direct Gemini image generation (requires paid key)
const callGeminiDirectImageModel = async (apiKey: string, description: string) => {
  const failures: string[] = [];
  const prompt = buildImagePrompt(description);

  for (const model of GEMINI_IMAGE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        },
      );

      const rawBody = await response.text();

      if (response.ok) {
        const payload = JSON.parse(rawBody);
        const image = extractInlineImage(payload);
        if (image) return { model, image };
        failures.push(`${model} returned no image data`);
        break;
      }

      failures.push(`${model} attempt ${attempt}: ${response.status}`);
      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === 2) break;
      await sleep(600 * 2 ** (attempt - 1));
    }
  }

  throw new Error(failures[failures.length - 1] || "Gemini image gen failed");
};

// Method 2: Free Pollinations.ai image generation (no API key needed)
const callPollinationsImage = async (description: string): Promise<Uint8Array> => {
  const prompt = encodeURIComponent(
    `Fashion catalog photo, front view, full outfit on plain white background: ${description}. Professional studio lighting, high quality.`
  );
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=768&nologo=true&seed=${Date.now()}`;
  
  console.log("Calling Pollinations.ai for image generation");
  
  const response = await fetch(url, { redirect: "follow" });
  
  if (!response.ok) {
    throw new Error(`Pollinations failed: ${response.status}`);
  }
  
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    throw new Error(`Pollinations returned non-image: ${contentType}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const { description, outfitId, itemIndex } = await req.json();
    if (!description) {
      return jsonResponse({ error: "Description is required" }, 400);
    }

    console.log("Generating clothing image for:", description.substring(0, 120));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let imageBytes: Uint8Array | null = null;
    let mimeType = "image/png";
    let usedModel = "unknown";

    // Try Gemini direct first (works with paid keys)
    if (GEMINI_API_KEY) {
      try {
        const result = await callGeminiDirectImageModel(GEMINI_API_KEY, description);
        imageBytes = Uint8Array.from(atob(result.image.data), (c) => c.charCodeAt(0));
        mimeType = result.image.mimeType;
        usedModel = result.model;
      } catch (e) {
        console.warn("Gemini image gen failed:", (e as Error).message);
      }
    }

    // Fallback: Pollinations.ai (free, no key needed)
    if (!imageBytes) {
      try {
        imageBytes = await callPollinationsImage(description);
        mimeType = "image/jpeg";
        usedModel = "pollinations.ai";
      } catch (e) {
        console.error("Pollinations also failed:", (e as Error).message);
      }
    }

    if (!imageBytes) {
      throw new Error("All image generation methods failed. Please try again later.");
    }

    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const fileName = `clothing-${outfitId ?? "x"}-${itemIndex ?? 0}-${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("user-images")
      .upload(fileName, imageBytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    const { data: urlData } = supabase.storage.from("user-images").getPublicUrl(uploadData.path);
    console.log(`Generated clothing image with ${usedModel}:`, urlData.publicUrl);

    return jsonResponse({ imageUrl: urlData.publicUrl });
  } catch (error: unknown) {
    console.error("Clothing image gen error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, message.includes("busy") ? 503 : 500);
  }
});
