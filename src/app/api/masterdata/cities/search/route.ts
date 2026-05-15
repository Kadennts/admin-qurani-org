import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() || '';
        const countryCode = searchParams.get('countryCode')?.trim() || '';
        const stateId = searchParams.get('stateId')?.trim() || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

        if (!q || q.length < 2) {
            return NextResponse.json({ success: false, error: "Query must be at least 2 characters" }, { status: 400 });
        }

        const supabase = await createAdminClient();

        let query = supabase
            .from("cities")
            .select("*")
            .ilike("name", `%${q}%`)
            .limit(limit);

        if (stateId && stateId !== 'all') {
            query = query.eq("state_id", parseInt(stateId));
        } else if (countryCode && countryCode !== 'All') {
            query = query.eq("country_code", countryCode.toUpperCase());
        }

        const { data, error } = await query.order("name");

        if (error) throw error;

        // Map snake_case → camelCase to match CityData interface
        const mapped = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            stateId: c.state_id,
            state: c.state_name,
            stateCode: c.state_code,
            countryId: c.country_id,
            country: c.country_name,
            countryCode: c.country_code,
            latitude: c.latitude,
            longitude: c.longitude,
            native: c.native,
            timezone: c.timezone,
        }));

        return NextResponse.json({
            success: true,
            data: mapped,
            count: mapped.length,
        });

    } catch (error) {
        console.error("[Masterdata Cities Search] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
