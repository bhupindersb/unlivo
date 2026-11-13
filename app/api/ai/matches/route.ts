import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 20;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    rankings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          property_id: { type: "string" },
          relevance_score: { type: "integer" },
          explanation: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          tradeoffs: { type: "array", items: { type: "string" } },
        },
        required: ["property_id", "relevance_score", "explanation", "strengths", "tradeoffs"],
      },
    },
  },
  required: ["rankings"],
};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Please sign in to view your matches." }, { status: 401 });

    const { requirementId } = await request.json();
    if (typeof requirementId !== "string" || requirementId.length > 80) {
      return NextResponse.json({ error: "A valid requirement is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Matching service is not configured." }, { status: 503 });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

    const { data: requirement, error: requirementError } = await supabase
      .from("buyer_requirements")
      .select("id,purpose,category,property_types,preferred_cities,preferred_localities,min_price,max_price,min_bedrooms,max_bedrooms,min_area_sqft,max_area_sqft,possession_preferences,furnishing_preferences,amenities,notes")
      .eq("id", requirementId)
      .eq("user_id", user.id)
      .single();
    if (requirementError || !requirement) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });

    const { data: candidates, error: matchError } = await supabase.rpc("get_buyer_requirement_matches", {
      p_requirement_id: requirementId,
      p_limit: 24,
    });
    if (matchError) return NextResponse.json({ error: "Unable to retrieve property matches." }, { status: 400 });
    if (!candidates?.length) return NextResponse.json({ aiEnabled: false, properties: [] });
    const normalizedCandidates = candidates.map((item: any) => ({ ...item, id: item.property_id }));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ aiEnabled: false, properties: normalizedCandidates });

    const candidateIds = candidates.map((item: { property_id: string }) => item.property_id);
    const { data: details } = await supabase
      .from("properties")
      .select("id,title,description,city,locality,price,rent_monthly,purpose,category,property_type,bedrooms,bathrooms,area_sqft,plot_area_sqyd,possession,furnishing")
      .in("id", candidateIds)
      .eq("status", "published");
    const detailsById = new Map((details || []).map((item: any) => [item.id, item]));
    const safeCandidates = candidates.map((item: any) => ({
      ...item,
      listing: detailsById.get(item.property_id) || null,
    }));

    const prompt = {
      requirement: {
        purpose: requirement.purpose,
        category: requirement.category,
        property_types: requirement.property_types,
        preferred_cities: requirement.preferred_cities,
        preferred_localities: requirement.preferred_localities,
        budget: { min: requirement.min_price, max: requirement.max_price },
        bedrooms: { min: requirement.min_bedrooms, max: requirement.max_bedrooms },
        area_sqft: { min: requirement.min_area_sqft, max: requirement.max_area_sqft },
        possession_preferences: requirement.possession_preferences,
        furnishing_preferences: requirement.furnishing_preferences,
        amenities: requirement.amenities,
        additional_preferences: requirement.notes,
      },
      candidates: safeCandidates,
    };

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MATCHING_MODEL || "gpt-4o-mini",
        instructions: "You are UNLIVO's property preference analyst. Rank only the supplied candidate properties by how well their verified listing information fits the buyer's softer preferences and natural-language notes. The deterministic match_score and match_reasons are authoritative for purpose, category, location, budget, type, bedroom and size criteria: do not contradict or replace them. Never invent amenities, distances, facilities, possession dates, prices or facts. If a fact is absent, say it is not specified or omit it. Do not penalize a property for a preference the buyer did not express. Return every candidate exactly once, using its exact property_id. relevance_score is a separate 0-100 estimate of qualitative preference relevance, not a probability or guarantee. Keep explanations concise and factual; tradeoffs should mention only clearly evidenced gaps or missing information.",
        input: JSON.stringify(prompt),
        text: {
          format: {
            type: "json_schema",
            name: "unlivo_property_match_analysis",
            strict: true,
            schema: responseSchema,
          },
        },
        max_output_tokens: 2200,
      }),
      signal: AbortSignal.timeout(16000),
    });

    if (!aiResponse.ok) {
      console.error("UNLIVO AI matching provider error", aiResponse.status);
      return NextResponse.json({ aiEnabled: false, properties: candidates });
    }
    const payload = await aiResponse.json();
    const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((part: any) => part.type === "output_text")?.text;
    if (!outputText) return NextResponse.json({ aiEnabled: false, properties: candidates });

    const parsed = JSON.parse(outputText);
    const allowedIds = new Set(candidateIds);
    const analyses = new Map<string, any>();
    for (const item of parsed.rankings || []) {
      if (!allowedIds.has(item.property_id) || analyses.has(item.property_id)) continue;
      analyses.set(item.property_id, {
        ai_relevance_score: Math.max(0, Math.min(100, Number(item.relevance_score) || 0)),
        ai_explanation: String(item.explanation || "").slice(0, 320),
        ai_strengths: Array.isArray(item.strengths) ? item.strengths.slice(0, 3).map((x: unknown) => String(x).slice(0, 140)) : [],
        ai_tradeoffs: Array.isArray(item.tradeoffs) ? item.tradeoffs.slice(0, 2).map((x: unknown) => String(x).slice(0, 140)) : [],
      });
    }
    const ranked = normalizedCandidates.map((item: any) => ({ ...item, ...(analyses.get(item.property_id) || {}) }))
      .sort((a: any, b: any) => (b.ai_relevance_score ?? -1) - (a.ai_relevance_score ?? -1) || b.match_score - a.match_score);

    return NextResponse.json({ aiEnabled: analyses.size > 0, properties: ranked });
  } catch (error) {
    console.error("UNLIVO AI matching failed", error);
    return NextResponse.json({ aiEnabled: false, error: "AI matching is temporarily unavailable." }, { status: 200 });
  }
}
