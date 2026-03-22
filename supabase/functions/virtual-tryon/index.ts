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
    const LIGHTX_API_KEY = Deno.env.get("LIGHTX_API_KEY");
    if (!LIGHTX_API_KEY) {
      throw new Error("LIGHTX_API_KEY is not configured");
    }

    const { userImageBase64, clothingDescription, clothingImageUrl } = await req.json();

    if (!userImageBase64) {
      return new Response(
        JSON.stringify({ error: "User image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clothingDescription && !clothingImageUrl) {
      return new Response(
        JSON.stringify({ error: "Clothing description or image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Initiate virtual try-on with LightX API
    const body: Record<string, string> = {
      imageUrl: userImageBase64.startsWith("data:")
        ? userImageBase64
        : `data:image/jpeg;base64,${userImageBase64}`,
    };

    if (clothingImageUrl) {
      body.clothImageUrl = clothingImageUrl;
    } else {
      body.clothDescription = clothingDescription;
    }

    const response = await fetch("https://api.lightxeditor.com/external/api/v2/aivirtualtryon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LIGHTX_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("LightX API error:", JSON.stringify(data));
      throw new Error(`LightX API failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    // The API returns an orderId for async processing
    const orderId = data.body?.orderId;

    if (!orderId) {
      // If result is immediate
      return new Response(JSON.stringify({ result: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Poll for result
    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(
        "https://api.lightxeditor.com/external/api/v2/order-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": LIGHTX_API_KEY,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const pollData = await pollRes.json();
      const status = pollData.body?.status;

      if (status === "active") {
        result = pollData.body;
        break;
      } else if (status === "failed") {
        throw new Error("LightX processing failed: " + JSON.stringify(pollData));
      }
      // Otherwise status is "pending" — keep polling
    }

    if (!result) {
      throw new Error("LightX processing timed out after 60 seconds");
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Virtual try-on error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
