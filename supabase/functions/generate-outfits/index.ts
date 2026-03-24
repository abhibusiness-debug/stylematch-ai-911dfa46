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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { gender, height, bodyType, skinTone, hairstyle, occasion } = await req.json();

    if (!gender || !bodyType || !occasion) {
      return new Response(
        JSON.stringify({ error: "Gender, body type, and occasion are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert AI fashion stylist. Generate exactly 3 complete outfit recommendations as a JSON array. Each outfit must be tailored to the user's physical attributes and occasion.

IMPORTANT: You must respond with ONLY a valid JSON array, no markdown, no explanation.

Each outfit object must have this exact structure:
{
  "name": "Outfit Name (creative, 2-3 words)",
  "occasion": "The occasion category",
  "colors": ["#hex1", "#hex2", "#hex3"],
  "items": [
    {
      "name": "Specific item name with color/material",
      "brand": "A real affordable brand available in India (H&M, Zara, Uniqlo, Mango, AJIO, Myntra, etc.)",
      "price": "₹X,XXX (realistic INR price)",
      "category": "Tops|Bottoms|Outerwear|Footwear|Accessories",
      "searchQuery": "exact search term to find this item on Amazon/Flipkart"
    }
  ]
}

Rules:
- Each outfit MUST have 3-4 items covering different categories
- Colors must complement the user's skin tone
- Styles must flatter the user's body type
- Prices must be realistic for Indian market
- Brand names must be real brands
- searchQuery should be specific enough to find the actual item online
- The 3 outfits should offer variety (e.g., one dressy, one casual, one trendy)`;

    const userPrompt = `Generate 3 personalized outfit recommendations for:
- Gender: ${gender}
- Height: ${height || "not specified"}cm
- Body Type: ${bodyType}
- Skin Tone: ${skinTone || "not specified"}
- Hairstyle: ${hairstyle || "not specified"}
- Occasion: ${occasion}

Consider:
1. Colors that complement ${skinTone || "their"} skin tone
2. Cuts and silhouettes that flatter a ${bodyType} body type
3. Appropriate formality for ${occasion}
4. Current fashion trends
5. Practical and accessible brands in India`;

    console.log("Generating outfits for:", { gender, bodyType, skinTone, occasion });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_outfits",
              description: "Return the generated outfit recommendations",
              parameters: {
                type: "object",
                properties: {
                  outfits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        occasion: { type: "string" },
                        colors: { type: "array", items: { type: "string" } },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              brand: { type: "string" },
                              price: { type: "string" },
                              category: { type: "string" },
                              searchQuery: { type: "string" },
                            },
                            required: ["name", "brand", "price", "category", "searchQuery"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "occasion", "colors", "items"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["outfits"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_outfits" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response received");

    // Extract structured output from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const outfits = parsed.outfits;

    if (!Array.isArray(outfits) || outfits.length === 0) {
      throw new Error("AI returned no outfits");
    }

    // Add IDs to outfits
    const outfitsWithIds = outfits.map((o: any, i: number) => ({
      ...o,
      id: i + 1,
    }));

    console.log(`Generated ${outfitsWithIds.length} outfits successfully`);

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
