import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

async function enrichCitiesCount(supabase: any, states: any[]) {
    if (!states.length) return states;

    const stateIds = states.map((s) => s.id).filter((id) => typeof id === "number");
    if (!stateIds.length) return states;

    const counts = new Map<number, number>();
    const chunkSize = 500;

    for (let i = 0; i < stateIds.length; i += chunkSize) {
        const chunk = stateIds.slice(i, i + chunkSize);
        const { data: cityRows, error } = await supabase
            .from("cities")
            .select("state_id")
            .in("state_id", chunk);

        if (error) {
            console.warn("[Masterdata States Search] Failed to enrich cities count:", error.message);
            continue;
        }

        for (const row of cityRows || []) {
            const sid = row.state_id as number;
            counts.set(sid, (counts.get(sid) || 0) + 1);
        }
    }

    return states.map((s) => ({
        ...s,
        citiesCount: counts.get(s.id) || 0,
    }));
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() || '';
        const countryCode = searchParams.get('countryCode')?.trim() || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

        if (!q || q.length < 2) {
            return NextResponse.json({ success: false, error: "Query must be at least 2 characters" }, { status: 400 });
        }

        let supabase;
        try {
            supabase = await createAdminClient();
        } catch (adminErr) {
            console.warn("[Masterdata States Search] Admin client unavailable, fallback to server client:", adminErr);
            supabase = await createClient();
        }

        let query = supabase
            .from("states")
            .select("*")
            .ilike("name", `%${q}%`)
            .limit(limit);

        if (countryCode && countryCode !== 'all') {
            query = query.eq("country_code", countryCode.toUpperCase());
        }

        const { data, error } = await query.order("name");

        if (error) throw error;

        // Map snake_case → camelCase to match StateData interface
        let mapped = (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            countryId: s.country_id,
            country: s.country_name,
            countryCode: s.country_code,
            fipsCode: s.fips_code,
            iso2: s.iso2,
            iso3166_2: s.iso3166_2,
            type: s.type,
            level: s.level,
            parentId: s.parent_id,
            native: s.native,
            latitude: s.latitude,
            longitude: s.longitude,
            timezone: s.timezone,
            flag: s.flag,
            citiesCount: 0,
        }));

        mapped = await enrichCitiesCount(supabase, mapped);

        return NextResponse.json({
            success: true,
            data: mapped,
            count: mapped.length,
        });

    } catch (error) {
        console.error("[Masterdata States Search] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
