import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
let _statesCache: { data: any[]; timestamp: number } | null = null;

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
            console.warn("[Masterdata States API] Failed to enrich cities count from cities table:", error.message);
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
        const countryCode = searchParams.get('countryCode')?.trim().toUpperCase() || '';
        const countryId = searchParams.get('countryId')?.trim() || '';

        const now = Date.now();

        // Use cache only for "all states" (no filter)
        if (!countryCode && !countryId && _statesCache && (now - _statesCache.timestamp < CACHE_TTL)) {
            const hasAnyCityCount = _statesCache.data.some((s: any) => Number(s?.citiesCount || 0) > 0)
            if (!hasAnyCityCount) {
                // Old cache can contain stale zero counts from previous logic.
                _statesCache = null
            } else {
            return NextResponse.json({
                success: true,
                data: _statesCache.data,
                count: _statesCache.data.length,
                cached: true,
            });
            }
        }

        let supabase;
        try {
            supabase = await createAdminClient();
        } catch (adminErr) {
            console.warn("[Masterdata States API] Admin client unavailable, fallback to server client:", adminErr);
            supabase = await createClient();
        }

        let query = supabase
            .from("states")
            .select("*, cities(count)")
            .order("id");

        if (countryCode) {
            query = query.eq("country_code", countryCode);
        } else if (countryId) {
            query = query.eq("country_id", parseInt(countryId));
        }

        let { data, error } = await query;

        // Fallback: some environments fail on relational select "cities(count)".
        // Keep states page usable by retrying with plain states query.
        if (error) {
            console.warn("[Masterdata States API] Relational count query failed, fallback to plain states:", error.message);

            let fallbackQuery = supabase
                .from("states")
                .select("*")
                .order("id");

            if (countryCode) {
                fallbackQuery = fallbackQuery.eq("country_code", countryCode);
            } else if (countryId) {
                fallbackQuery = fallbackQuery.eq("country_id", parseInt(countryId));
            }

            const fallback = await fallbackQuery;
            data = fallback.data as any[] | null;
            error = fallback.error;
        }

        if (error) throw error;

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
            citiesCount: Array.isArray(s.cities) && s.cities.length > 0 ? s.cities[0].count : 0,
        }));

        // If relation count isn't available/reliable, enrich from cities table.
        if (mapped.some((s) => (s.citiesCount || 0) === 0)) {
            mapped = await enrichCitiesCount(supabase, mapped);
        }

        // Cache "all states" response
        if (!countryCode && !countryId) {
            _statesCache = { data: mapped, timestamp: Date.now() };
        }

        return NextResponse.json({
            success: true,
            data: mapped,
            count: mapped.length,
            cached: false,
        });

    } catch (error) {
        console.error("[Masterdata States API] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
