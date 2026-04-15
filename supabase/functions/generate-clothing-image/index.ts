import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const GEMINI_IMAGE_MODELS = ["gemini-2.5-flash-image", "gemini-3.1-flash-image-preview"];
const LOVABLE_IMAGE_MODELS = ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image-preview"];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const extractInlineImage = (
  node: unknown,
): {
  data: string;
  mimeType: string;
} | null => {
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
      return {
        data,
        mimeType: typeof mimeType === "string" ? mimeType : "image/png",
      };
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

const callGeminiDirectImageModel = async (apiKey: string, description: string) => {
  const failures: string[] = [];
  const prompt = buildImagePrompt(description);

  for (const model of GEMINI_IMAGE_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        },
      );

      const rawBody = await response.text();

      if (response.ok) {
        const payload = JSON.parse(rawBody);
        const image = extractInlineImage(payload);

        if (image) {
          return { model, image };
        }

        failures.push(`${model} returned no image data`);
        break;
      }

      failures.push(`${model} attempt ${attempt} failed with ${response.status}: ${rawBody.slice(0, 300)}`);

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === 3) {
        break;
      }

      await sleep(600 * 2 ** (attempt - 1));
    }
  }

  throw new Error(
    failures[failures.length - 1] || "Gemini direct image generation failed",
  );
};

const callLovableGatewayImageModel = async (lovableKey: string, description: string) => {
  const failures: string[] = [];
  const prompt = buildImagePrompt(description);

  for (const model of LOVABLE_IMAGE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const rawBody = await response.text();

      if (response.ok) {
        const payload = JSON.parse(rawBody);
        const image = extractInlineImage(payload);

        if (image) {
          return { model, image };
        }

        // Check if there's a base64 image in the response choices
        const choices = payload?.choices;
        if (Array.isArray(choices)) {
          for (const choice of choices) {
            const img = extractInlineImage(choice);
            if (img) return { model, image: img };
          }
        }

        failures.push(`${model} (gateway) returned no image data`);
        break;
      }

      failures.push(`${model} (gateway) attempt ${attempt} failed: ${response.status}`);

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === 2) break;
      await sleep(1000);
    }
  }

  throw new Error(failures[failures.length - 1] || "Lovable AI image generation failed");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("No AI API key is configured for image generation");
    }

    const { description, outfitId, itemIndex } = await req.json();
    if (!description) {
      return jsonResponse({ error: "Description is required" }, 400);
    }

    console.log("Generating clothing image for:", description);

    let result: { model: string; image: { data: string; mimeType: string } } | null = null;

    // Try Gemini direct first
    if (GEMINI_API_KEY) {
      try {
        result = await callGeminiDirectImageModel(GEMINI_API_KEY, description);
      } catch (e) {
        console.warn("Gemini direct image gen failed, trying Lovable AI fallback:", (e as Error).message);
      }
    }

    // Fallback to Lovable AI Gateway
    if (!result && LOVABLE_API_KEY) {
      try {
        result = await callLovableGatewayImageModel(LOVABLE_API_KEY, description);
      } catch (e) {
        console.error("Lovable AI image gen also failed:", (e as Error).message);
      }
    }

    if (!result) {
      throw new Error("All image generation methods failed. Please try again later.");
    }

    const { model, image } = result;

    const ext = image.mimeType.includes("jpeg") || image.mimeType.includes("jpg") ? "jpg" : "png";
    const bytes = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `clothing-${outfitId ?? "x"}-${itemIndex ?? 0}-${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("user-images")
      .upload(fileName, bytes, { contentType: image.mimeType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    const { data: urlData } = supabase.storage.from("user-images").getPublicUrl(uploadData.path);

    console.log(`Generated clothing image with ${model}:`, urlData.publicUrl);

    return jsonResponse({ imageUrl: urlData.publicUrl });
  } catch (error: unknown) {
    console.error("Clothing image gen error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, message.includes("busy") ? 503 : 500);
  }
});
