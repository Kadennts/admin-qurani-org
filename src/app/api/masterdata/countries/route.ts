import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
let _cache: { data: any[]; timestamp: number } | null = null;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const currencyFilter = searchParams.get('currency')?.trim().toUpperCase() ?? null;

        const now = Date.now();

        // Serve from cache if still fresh
        if (_cache && (now - _cache.timestamp < CACHE_TTL)) {
            const data = currencyFilter
                ? _cache.data.filter(c => c.currency?.trim().toUpperCase() === currencyFilter)
                : _cache.data;

            return NextResponse.json({
                success: true,
                data,
                count: data.length,
                cached: true,
            });
        }

        const supabase = await createAdminClient();

        // Fetch from Supabase directly for speed and to get states/cities counts natively
        const { data: dbData, error } = await supabase
            .from("countries")
            .select("*, states(count), cities(count)");

        if (error) throw error;

        // Map snake_case from DB to camelCase for the frontend CountryData interface
        const mappedData = dbData.map(c => ({
            id: c.id,
            name: c.name,
            iso3: c.iso3,
            iso2: c.iso2,
            numericCode: c.numeric_code,
            phoneCode: c.phonecode, // notice db is phonecode
            capital: c.capital,
            currency: c.currency,
            currencyName: c.currency_name,
            currencySymbol: c.currency_symbol,
            tld: c.tld,
            native: c.native,
            population: c.population,
            gdp: c.gdp,
            region: c.region,
            regionId: c.region_id,
            subregion: c.subregion,
            subregionId: c.subregion_id,
            nationality: c.nationality,
            timezones: c.timezones,
            latitude: c.latitude,
            longitude: c.longitude,
            emoji: c.emoji,
            emojiU: c.emojiU,
            flag: c.flag,
            wikiDataId: c.wikiDataId,
            statesCount: Array.isArray(c.states) && c.states.length > 0 ? c.states[0].count : 0,
            citiesCount: Array.isArray(c.cities) && c.cities.length > 0 ? c.cities[0].count : 0,
        }));

        // Sort by ID naturally
        mappedData.sort((a, b) => a.id - b.id);

        // Save to cache
        _cache = { data: mappedData, timestamp: Date.now() };

        // Filter if currency query param was provided
        const filtered = currencyFilter
            ? mappedData.filter(c => c.currency?.trim().toUpperCase() === currencyFilter)
            : mappedData;

        return NextResponse.json({
            success: true,
            data: filtered,
            count: filtered.length,
            cached: false,
        });

    } catch (error) {
        console.error("[MasterdataCountries] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
