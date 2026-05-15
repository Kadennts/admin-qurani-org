import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/utils/supabase/server"
import { normalizeUsername } from "@/utils/validation/username"

type UpdateUserPayload = {
  username?: string
  previousUsername?: string
  name?: string
  email?: string
  isBlocked?: boolean
  role?: "admin" | "member" | "support" | "billing" | string
  countryId?: number | null
  stateId?: number | null
  cityId?: number | null
  countryName?: string
  stateName?: string
  cityName?: string
}

const toNullableNumber = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("myqurani_user")?.value
    if (!userCookie) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    try {
      JSON.parse(decodeURIComponent(userCookie))
    } catch {
      return NextResponse.json({ success: false, message: "Invalid auth context" }, { status: 401 })
    }

    const { userId } = params
    const targetUserId = String(userId || "").trim()

    if (!targetUserId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 })
    }

    const body = (await request.json()) as UpdateUserPayload

    const normalizedUsername = typeof body.username === "string" && body.username.trim()
      ? `@${normalizeUsername(body.username)}`
      : undefined

    const updateData: Record<string, unknown> = {}

    if (normalizedUsername !== undefined) updateData.username = normalizedUsername
    if (typeof body.name === "string") updateData.name = body.name
    if (typeof body.email === "string") updateData.email = body.email
    if (typeof body.isBlocked === "boolean") updateData.isBlocked = body.isBlocked
    if (typeof body.role === "string" && body.role.trim()) updateData.role = body.role.trim().toLowerCase()

    const countryId = toNullableNumber(body.countryId)
    const stateId = toNullableNumber(body.stateId)
    const cityId = toNullableNumber(body.cityId)

    if (countryId !== undefined) updateData.countryId = countryId
    if (stateId !== undefined) updateData.stateId = stateId
    if (cityId !== undefined) updateData.cityId = cityId

    if (typeof body.countryName === "string") updateData.countryName = body.countryName
    if (typeof body.stateName === "string") updateData.stateName = body.stateName
    if (typeof body.cityName === "string") updateData.cityName = body.cityName

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const tryUpdateById = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", targetUserId)
      .select("*")
      .maybeSingle()

    if (tryUpdateById.error) {
      return NextResponse.json(
        { success: false, message: tryUpdateById.error.message },
        { status: 500 }
      )
    }

    if (tryUpdateById.data) {
      return NextResponse.json({ success: true, data: tryUpdateById.data })
    }

    const previousUsername =
      typeof body.previousUsername === "string" ? body.previousUsername.trim() : ""

    if (!previousUsername) {
      return NextResponse.json(
        { success: false, message: "User profile not found in local database" },
        { status: 404 }
      )
    }

    const tryUpdateByUsername = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("username", previousUsername)
      .select("*")
      .maybeSingle()

    if (tryUpdateByUsername.error) {
      return NextResponse.json(
        { success: false, message: tryUpdateByUsername.error.message },
        { status: 500 }
      )
    }

    if (!tryUpdateByUsername.data) {
      return NextResponse.json(
        { success: false, message: "User profile not found in local database" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: tryUpdateByUsername.data })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    )
  }
}
