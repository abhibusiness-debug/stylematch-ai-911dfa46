import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      return new Response(
        JSON.stringify({ error: "Gender, body type, and occasion are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("Gemini response received");

    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error("No text in Gemini response:", JSON.stringify(aiData).substring(0, 500));
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(textContent);
    const outfits = parsed.outfits || parsed;

    if (!Array.isArray(outfits) || outfits.length === 0) {
      throw new Error("AI returned no outfits");
    }

    const outfitsWithIds = outfits.map((o: any, i: number) => ({
      ...o,
      id: i + 1,
    }));

    console.log(`Generated ${outfitsWithIds.length} budget outfits successfully`);

    return new Response(JSON.stringify({ outfits: outfitsWithIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Outfit generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
