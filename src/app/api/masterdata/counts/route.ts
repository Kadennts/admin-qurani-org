import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createAdminClient();

        // Run queries in parallel for better performance
        const [statesRes, citiesRes, countriesRes] = await Promise.all([
            // Get states count
            supabase.from("states").select("id", { count: "exact", head: true }),
            
            // Get cities count
            supabase.from("cities").select("id", { count: "exact", head: true }),
            
            // Get regions by getting unique regions from countries table
            supabase.from("countries").select("region")
        ]);

        if (statesRes.error) throw statesRes.error;
        if (citiesRes.error) throw citiesRes.error;
        if (countriesRes.error) throw countriesRes.error;

        // Calculate unique regions
        const regionsSet = new Set(
            (countriesRes.data || [])
                .map((c: any) => c.region)
                .filter((r: string | null | undefined) => r && r.trim() !== "")
        );

        return NextResponse.json({
            success: true,
            data: {
                regions: regionsSet.size,
                states: statesRes.count || 0,
                cities: citiesRes.count || 0
            }
        });

    } catch (error) {
        console.error("[Masterdata Counts API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch masterdata counts" },
            { status: 500 }
        );
    }
}
