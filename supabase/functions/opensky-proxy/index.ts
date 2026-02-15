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
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "states/all";
    const icao24 = url.searchParams.get("icao24") || "";
    const lamin = url.searchParams.get("lamin") || "";
    const lamax = url.searchParams.get("lamax") || "";
    const lomin = url.searchParams.get("lomin") || "";
    const lomax = url.searchParams.get("lomax") || "";

    let apiUrl = `https://opensky-network.org/api/${endpoint}`;
    const params = new URLSearchParams();
    if (icao24) params.set("icao24", icao24);
    if (lamin) params.set("lamin", lamin);
    if (lamax) params.set("lamax", lamax);
    if (lomin) params.set("lomin", lomin);
    if (lomax) params.set("lomax", lomax);

    const paramStr = params.toString();
    if (paramStr) apiUrl += `?${paramStr}`;

    console.log("Fetching from OpenSky:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenSky error:", response.status, text);
      return new Response(
        JSON.stringify({ error: `OpenSky API error: ${response.status}`, details: text }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
