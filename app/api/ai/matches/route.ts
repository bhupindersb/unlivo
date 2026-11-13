import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Candidate = {
  property_id: string;
  match_score: number;
  possession: string | null;
  furnishing: string | null;
  [key: string]: unknown;
};

const normalize = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

function preferenceResult(candidate: Candidate, requirement: any) {
  const strengths: string[] = [];
  const tradeoffs: string[] = [];
  let extraPoints = 0;
  let extraWeight = 0;

  const compare = (requested: unknown, actual: unknown, label: string) => {
    const preferences = Array.isArray(requested) ? requested.map(normalize).filter(Boolean) : [];
    const listingValue = normalize(actual);
    if (!preferences.length || !listingValue) return;

    extraWeight += 10;
    const matched = preferences.some((preference) =>
      listingValue === preference || listingValue.includes(preference) || preference.includes(listingValue)
    );
    if (matched) {
      extraPoints += 1000;
      strengths.push(label + ": " + String(actual).replaceAll("_", " "));
    } else {
      tradeoffs.push(label + " is listed as " + String(actual).replaceAll("_", " ") + ", which differs from your preference");
    }
  };

  compare(requirement.possession_preferences, candidate.possession, "Possession");
  compare(requirement.furnishing_preferences, candidate.furnishing, "Furnishing");

  const baseScore = Math.max(0, Math.min(100, Number(candidate.match_score) || 0));
  const totalWeight = 80 + extraWeight;
  const score = Math.round((baseScore * 80 + extraPoints) / totalWeight);
  const summary = extraWeight
    ? strengths.length
      ? "Matches your core requirements and at least one additional preference."
      : "Matches your core requirements, with some differences in additional preferences."
    : "Ranked using your location, budget, property type, bedrooms and size requirements.";

  return {
    preference_fit_score: score,
    preference_fit_summary: summary,
    preference_fit_strengths: strengths,
    preference_fit_tradeoffs: tradeoffs,
  };
}

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
      global: { headers: { Authorization: "Bearer " + token } },
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
    if (matchError) {
      console.error("UNLIVO smart matching query failed", matchError.message);
      return NextResponse.json({ error: "Unable to retrieve property matches." }, { status: 400 });
    }

    const properties = ((candidates || []) as Candidate[])
      .map((candidate) => ({ ...candidate, ...preferenceResult(candidate, requirement) }))
      .sort((a, b) => b.preference_fit_score - a.preference_fit_score || b.match_score - a.match_score);

    return NextResponse.json({ matchingMode: "rules", properties });
  } catch (error) {
    console.error("UNLIVO smart matching failed", error);
    return NextResponse.json({ error: "Unable to calculate property matches right now." }, { status: 500 });
  }
}
