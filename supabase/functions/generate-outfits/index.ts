import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const TEXT_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const extractTextResponse = (payload: any) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text || null;
};

const parseOutfits = (rawText: string) => {
  const trimmed = rawText.trim();
  const jsonCandidate = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] ?? trimmed;
  const parsed = JSON.parse(jsonCandidate);
  const outfits = Array.isArray(parsed) ? parsed : parsed?.outfits;

  if (!Array.isArray(outfits) || outfits.length === 0) {
    throw new Error("AI returned no outfits");
  }

  return outfits.map((outfit: any, index: number) => ({
    id: index + 1,
    name: typeof outfit?.name === "string" && outfit.name.trim() ? outfit.name.trim() : `Look ${index + 1}`,
    occasion: typeof outfit?.occasion === "string" && outfit.occasion.trim() ? outfit.occasion.trim() : "Custom",
    colors: Array.isArray(outfit?.colors) ? outfit.colors.filter((color: unknown) => typeof color === "string") : [],
    fullOutfitDescription:
      typeof outfit?.fullOutfitDescription === "string" ? outfit.fullOutfitDescription.trim() : "",
    items: Array.isArray(outfit?.items)
      ? outfit.items.map((item: any) => ({
          name: typeof item?.name === "string" ? item.name : "Style piece",
          brand: typeof item?.brand === "string" ? item.brand : "Budget brand",
          price: typeof item?.price === "string" ? item.price : "₹999",
          category: typeof item?.category === "string" ? item.category : "Accessories",
          searchQueryFlipkart:
            typeof item?.searchQueryFlipkart === "string" && item.searchQueryFlipkart.trim()
              ? item.searchQueryFlipkart
              : typeof item?.name === "string"
              ? item.name
              : "fashion item",
          searchQueryMyntra:
            typeof item?.searchQueryMyntra === "string" && item.searchQueryMyntra.trim()
              ? item.searchQueryMyntra
              : typeof item?.name === "string"
              ? item.name
              : "fashion item",
        }))
      : [],
  }));
};

const callGeminiWithFallback = async (apiKey: string, prompt: string) => {
  const failures: string[] = [];

  for (const model of TEXT_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const rawBody = await response.text();

      if (response.ok) {
        const payload = JSON.parse(rawBody);
        const text = extractTextResponse(payload);

        if (text) {
          return { model, text };
        }

        failures.push(`${model} returned an empty response`);
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
    failures[failures.length - 1]?.includes("503")
      ? "Gemini is busy right now. Please retry in a moment."
      : failures[failures.length - 1] || "Unable to generate outfits right now.",
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { gender, height, bodyType, skinTone, hairstyle, occasion } = await req.json();

    if (!gender || !bodyType || !occasion) {
      return jsonResponse({ error: "Gender, body type, and occasion are required" }, 400);
    }

    const systemPrompt = `You are an expert AI fashion stylist specializing in BUDGET-FRIENDLY fashion in India. Generate exactly 3 complete outfit recommendations as a JSON array. Each outfit must be tailored to the user's physical attributes and occasion.

IMPORTANT: You must respond with ONLY a valid JSON object with an "outfits" key containing the array, no markdown, no explanation.

CRITICAL PRICING RULES:
- Total outfit cost must be UNDER ₹3,000
- Individual items should be ₹200 - ₹1,200 max
- Focus on affordable brands: H&M, Zara (sale items), AJIO, Myntra house brands (HRX, Roadster, Mast & Harbour, HERE&NOW, Kook N Keech), FBB, Max Fashion, Pantaloons, Westside, V-Mart, Decathlon
- NO luxury or premium brands

Each outfit object must have this exact structure:
{
  "name": "Outfit Name (creative, 2-3 words)",
  "occasion": "The occasion category",
  "colors": ["#hex1", "#hex2", "#hex3"],
  "fullOutfitDescription": "Complete description of the full outfit including top, bottom, shoes for virtual try-on rendering",
  "items": [
    {
      "name": "Specific item name with color/material",
      "brand": "A real affordable brand available in India",
      "price": "₹XXX (realistic budget INR price)",
      "category": "Tops|Bottoms|Outerwear|Footwear|Accessories",
      "searchQueryFlipkart": "exact search term to find this item on Flipkart",
      "searchQueryMyntra": "exact search term to find this item on Myntra"
    }
  ]
}

Rules:
- Each outfit MUST have 4-5 items: Top + Bottom + Footwear + 1-2 Accessories
- Colors must complement the user's skin tone
- Styles must flatter the user's body type
- ALL prices must be budget-friendly (₹200-₹1,200 per item)
- Brand names must be real affordable Indian brands
- The 3 outfits should offer variety (e.g., one dressy, one casual, one trendy)`;

    const userPrompt = `Generate 3 BUDGET-FRIENDLY personalized outfit recommendations for:
- Gender: ${gender}
- Height: ${height || "not specified"}cm
- Body Type: ${bodyType}
- Skin Tone: ${skinTone || "not specified"}
- Hairstyle: ${hairstyle || "not specified"}
- Occasion: ${occasion}

IMPORTANT: Keep all items affordable (₹200-₹1,200 each, total under ₹3,000).
Focus on Flipkart and Myntra available brands.
Respond with ONLY valid JSON: {"outfits": [...]}`;

    console.log("Generating budget outfits for:", { gender, bodyType, skinTone, occasion });

    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const { model, text } = await callGeminiWithFallback(GEMINI_API_KEY, prompt);
    const outfitsWithIds = parseOutfits(text);

    console.log(`Generated ${outfitsWithIds.length} budget outfits successfully with ${model}`);

    return jsonResponse({ outfits: outfitsWithIds });
  } catch (error: unknown) {
    console.error("Outfit generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, message.includes("busy") ? 503 : 500);
  }
});
