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
    const apiKey = Deno.env.get("AVIATION_STACK_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Aviation Stack API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const flightIata = url.searchParams.get("flight_iata") || "";

    let apiUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}`;
    if (search) apiUrl += `&airline_name=${encodeURIComponent(search)}`;
    if (flightIata) apiUrl += `&flight_iata=${encodeURIComponent(flightIata)}`;

    console.log("Fetching from Aviation Stack");

    const response = await fetch(apiUrl);
    if (!response.ok) {
      const text = await response.text();
      console.error("Aviation Stack error:", response.status, text);
      return new Response(
        JSON.stringify({ error: `Aviation Stack API error: ${response.status}` }),
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
