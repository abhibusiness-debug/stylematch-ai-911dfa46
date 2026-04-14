import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const SUCCESS_STATUSES = new Set(["active", "completed", "done", "success"]);
const FAILURE_STATUSES = new Set(["failed", "error", "cancelled"]);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractOutputUrl = (payload: unknown): string | null => {
  if (!payload) return null;

  if (typeof payload === "string") {
    return payload.startsWith("http") ? payload : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractOutputUrl(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  for (const key of ["url", "imageUrl", "output", "result", "images", "data", "body"]) {
    const found = extractOutputUrl(record[key]);
    if (found) return found;
  }

  for (const value of Object.values(record)) {
    const found = extractOutputUrl(value);
    if (found) return found;
  }

  return null;
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

    const { imageUrl, styleImageUrl } = await req.json();

    if (!imageUrl) {
      return jsonResponse({ error: "User image URL is required" }, 400);
    }

    if (!styleImageUrl) {
      return jsonResponse({ error: "Clothing image URL is required" }, 400);
    }

    console.log("Calling LightX API with imageUrl:", imageUrl.substring(0, 80), "styleImageUrl:", styleImageUrl.substring(0, 80));

    // Step 1: Initiate virtual try-on with LightX API
    const response = await fetch("https://api.lightxeditor.com/external/api/v2/aivirtualtryon", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-api-key": LIGHTX_API_KEY,
      },
      body: JSON.stringify({ imageUrl, styleImageUrl }),
    });

    const initialText = await response.text();
    const data = safeJsonParse(initialText);
    console.log("LightX initial response:", initialText);

    if (!response.ok) {
      console.error("LightX API error:", initialText);
      throw new Error(`LightX API failed [${response.status}]: ${initialText}`);
    }

    const immediateOutput = extractOutputUrl(data);
    if (immediateOutput) {
      return jsonResponse({ result: { output: immediateOutput, status: "completed" } });
    }

    // The API returns an orderId for async processing
    const orderId = data?.body?.orderId ?? data?.orderId;

    if (!orderId || typeof orderId !== "string") {
      throw new Error("LightX did not return an order ID or output image");
    }

    // Step 2: Poll for result
    let lastStatus = "pending";

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(
        "https://api.lightxeditor.com/external/api/v2/order-status",
        {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-api-key": LIGHTX_API_KEY,
          },
          body: JSON.stringify({ orderId }),
        },
      );

      const pollText = await pollRes.text();
      const pollData = safeJsonParse(pollText);
      console.log(`Poll attempt ${i + 1}:`, pollText);

      if (!pollRes.ok) {
        throw new Error(`LightX polling failed [${pollRes.status}]: ${pollText}`);
      }

      const status = String(pollData?.body?.status ?? pollData?.status ?? "pending").toLowerCase();
      lastStatus = status;
      const outputUrl = extractOutputUrl(pollData);

      if (outputUrl && SUCCESS_STATUSES.has(status)) {
        return jsonResponse({ result: { output: outputUrl, status } });
      }

      if (FAILURE_STATUSES.has(status)) {
        throw new Error(`LightX processing failed: ${pollText}`);
      }

      if (outputUrl) {
        return jsonResponse({ result: { output: outputUrl, status } });
      }
    }

    throw new Error(`LightX processing timed out after 60 seconds (last status: ${lastStatus})`);
  } catch (error: unknown) {
    console.error("Virtual try-on error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
