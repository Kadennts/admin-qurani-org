import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/utils/supabase/server"

type OverridesPayload = {
  userIds?: Array<string | number>
  usernames?: string[]
}

const selectFields = [
  "id",
  "username",
  "name",
  "email",
  "role",
  "isBlocked",
  "countryId",
  "stateId",
  "cityId",
  "countryName",
  "stateName",
  "cityName",
].join(", ")

const toStringArray = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0)
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("myqurani_user")?.value
    if (!userCookie) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    try {
      const parsedUser = JSON.parse(decodeURIComponent(userCookie))
      const roles = Array.isArray(parsedUser?.roles) ? parsedUser.roles.map((r: unknown) => String(r).toLowerCase()) : []
      if (!roles.includes("admin")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid auth context" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as OverridesPayload
    const userIds = toStringArray(body.userIds).slice(0, 200)
    const usernames = toStringArray(body.usernames).slice(0, 200)

    if (userIds.length === 0 && usernames.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = await createAdminClient()
    const rows: any[] = []

    if (userIds.length > 0) {
      const byId = await supabase
        .from("user_profiles")
        .select(selectFields)
        .in("id", userIds)

      if (!byId.error && Array.isArray(byId.data)) {
        rows.push(...byId.data)
      }
    }

    if (usernames.length > 0) {
      const byUsername = await supabase
        .from("user_profiles")
        .select(selectFields)
        .in("username", usernames)

      if (!byUsername.error && Array.isArray(byUsername.data)) {
        rows.push(...byUsername.data)
      }
    }

    const unique = Array.from(
      new Map(rows.map((row) => [String(row.id), row])).values()
    )

    return NextResponse.json({ success: true, data: unique })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load user overrides",
      },
      { status: 500 }
    )
  }
}

